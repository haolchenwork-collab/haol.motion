// Cloudflare Pages Function: GET /api/stats?range=7|30|90|all
// Reads visitor stats from the GoatCounter API for the /admin/ page.
//
// Environment variables (set in Cloudflare Pages > Settings > Variables):
//   GOATCOUNTER_TOKEN   secret, a GoatCounter API key with "Read statistics" only
//   ADMIN_PASSWORD      secret, checked by functions/api/_middleware.js
//
// /admin/* and /api/* both sit behind the password middleware.

const GC = "https://haolmotion.goatcounter.com/api/v0";
const SINCE = "2026-10-12T00:00:00Z"; // tracking went live
const RANGES = { "7": 7, "30": 30, "90": 90 };
// Middle of each time-on-page bucket sent by js/main.js, in seconds.
const STAY_MID = { "0-10s": 5, "10-30s": 20, "30-60s": 45, "1-2m": 90, "2-5m": 210, "5m+": 420 };

// Same for hover previews on the work cards.
const PREVIEW_MID = { "2-5s": 3.5, "5-10s": 7.5, "10-30s": 20, "30s+": 45 };

function stayStats(b, mid = STAY_MID) {
  let n = 0, sum = 0;
  for (const k in b) { n += b[k]; sum += b[k] * mid[k]; }
  return { n, avg: n ? Math.round(sum / n) : 0 };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function hour(d) {
  d = new Date(d);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString().replace(".000", "");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GoatCounter rate-limits API keys, and answers a burst with 429 (and
// sometimes 404), so calls go one at a time and are retried after a pause.
async function gc(env, path, params) {
  const url = GC + path + "?" + new URLSearchParams(params);
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(url, { headers: { authorization: "Bearer " + env.GOATCOUNTER_TOKEN } });
    if (r.ok) return r.json();
    if (attempt < 3 && (r.status === 429 || r.status === 404 || r.status >= 500)) {
      await sleep(1000 * (attempt + 1));
      continue;
    }
    throw new Error("goatcounter " + path + " " + r.status);
  }
}

// The side panels are nice to have; an empty list beats no page at all.
async function gcSoft(env, path, params) {
  try {
    return await gc(env, path, params);
  } catch {
    return { stats: [] };
  }
}

// "/haol.motion/work/x.html" and "/work/x.html" are the same page on the
// two hosts; "/" and "/index.html" are the same page too.
function normPath(p) {
  p = p.replace(/^\/haol\.motion(?=\/|$)/, "") || "/";
  return p.replace(/(^|\/)index\.html$/, "$1");
}

export async function onRequestGet({ request, env }) {
  if (!env.GOATCOUNTER_TOKEN) return json({ error: "not_configured" }, 500);

  const range = new URL(request.url).searchParams.get("range") || "30";
  const now = new Date();
  const end = hour(now.getTime() + 3600e3);
  let start = RANGES[range] ? hour(now.getTime() - RANGES[range] * 864e5) : SINCE;
  if (start < SINCE) start = SINCE;
  const q = { start, end };

  // Cache each range for a few minutes so reloading the page or switching
  // tabs does not run into GoatCounter's rate limit.
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = new Request(new URL(request.url).origin + "/__stats-cache/v4/" + encodeURIComponent(range));
  try {
    const cached = cache && (await cache.match(cacheKey));
    if (cached) return cached;
  } catch {}

  try {
    const total = await gc(env, "/stats/total", q);
    // The same length of time just before this range, for the "vs last period" figure.
    let prevTotal = null;
    if (RANGES[range]) {
      const span = new Date(end) - new Date(start);
      const prevStart = hour(new Date(start) - span);
      // Skip it when that earlier stretch reaches back before tracking began.
      if (prevStart >= SINCE) prevTotal = (await gcSoft(env, "/stats/total", { start: prevStart, end: start })).total ?? null;
    }
    // Page views and events share one list, capped at 100 rows per call, so
    // keep asking (leaving out what we already have) until it says no more.
    const hitRows = [];
    const seen = [];
    for (let i = 0; i < 5; i++) {
      const params = { ...q, limit: 100 };
      if (seen.length) params.exclude_paths = seen.join(",");
      const r = await gc(env, "/stats/hits", params);
      for (const h of r.hits || []) { hitRows.push(h); seen.push(h.path_id); }
      if (!r.more || !(r.hits || []).length) break;
    }
    const refs = await gcSoft(env, "/stats/toprefs", { ...q, limit: 10 });
    const locs = await gcSoft(env, "/stats/locations", { ...q, limit: 10 });
    const sizes = await gcSoft(env, "/stats/sizes", { ...q, limit: 6 });

    const pages = new Map();
    const plays = [];
    const stay = new Map(); // page -> { b: { bucket: count } }
    const previews = new Map();
    for (const h of hitRows) {
      if (h.event) {
        // Video plays are sent from js/main.js as events named play/<page>.
        if (h.path.startsWith("play/")) plays.push({ name: h.path.slice(5), title: h.title || "", count: h.count });
        // Time on page arrives as stay/<page>/<bucket>.
        const pv = h.path.match(/^preview\/(.+)\/([^/]+)$/);
        if (pv && PREVIEW_MID[pv[2]]) {
          const cur = previews.get(pv[1]) || { name: pv[1], b: {} };
          cur.b[pv[2]] = (cur.b[pv[2]] || 0) + h.count;
          previews.set(pv[1], cur);
        }
        const m = h.path.match(/^stay\/(.+)\/([^/]+)$/);
        if (m && STAY_MID[m[2]]) {
          const cur = stay.get(m[1]) || { name: m[1], b: {} };
          cur.b[m[2]] = (cur.b[m[2]] || 0) + h.count;
          stay.set(m[1], cur);
        }
        continue;
      }
      const path = normPath(h.path);
      const title = (h.title || "").replace(/\s*\|\s*浩辰 HaoChen\s*$/, "").trim();
      const cur = pages.get(path) || { path, title: "", count: 0 };
      cur.count += h.count;
      if (path === "/") cur.title = "首頁";
      else if (!cur.title && title) cur.title = title;
      pages.set(path, cur);
    }

    const all = {};
    for (const p of stay.values()) for (const k in p.b) all[k] = (all[k] || 0) + p.b[k];
    const stayPages = [...stay.values()].map((p) => ({ name: p.name, ...stayStats(p.b) })).sort((a, b) => b.n - a.n);

    const pick = (r) => (r.stats || []).map((s) => ({ id: s.id || "", name: s.name || "", count: s.count }));
    const res = json({
      start, end,
      total: total.total,
      prevTotal,
      plays: plays.sort((a, b) => b.count - a.count),
      previews: [...previews.values()].map((p) => ({ name: p.name, ...stayStats(p.b, PREVIEW_MID) })).sort((a, b) => b.n - a.n),
      stay: { ...stayStats(all), buckets: Object.keys(STAY_MID).map((k) => ({ name: k, count: all[k] || 0 })), pages: stayPages },
      daily: (total.stats || []).map((s) => ({ day: s.day, count: s.daily })),
      pages: [...pages.values()].sort((a, b) => b.count - a.count),
      refs: pick(refs),
      locations: pick(locs),
      sizes: pick(sizes),
    });
    try {
      const stored = new Response(res.clone().body, res);
      stored.headers.set("cache-control", "max-age=300");
      if (cache) await cache.put(cacheKey, stored);
    } catch {}
    return res;
  } catch (e) {
    return json({ error: "upstream", detail: String(e.message || e) }, 502);
  }
}
