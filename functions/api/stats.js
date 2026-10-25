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
  const cacheKey = new Request(new URL(request.url).origin + "/__stats-cache/" + encodeURIComponent(range));
  try {
    const cached = cache && (await cache.match(cacheKey));
    if (cached) return cached;
  } catch {}

  try {
    const total = await gc(env, "/stats/total", q);
    const hits = await gc(env, "/stats/hits", { ...q, limit: 100 });
    const refs = await gcSoft(env, "/stats/toprefs", { ...q, limit: 10 });
    const locs = await gcSoft(env, "/stats/locations", { ...q, limit: 10 });
    const sizes = await gcSoft(env, "/stats/sizes", { ...q, limit: 6 });

    const pages = new Map();
    for (const h of hits.hits || []) {
      if (h.event) continue;
      const path = normPath(h.path);
      const title = (h.title || "").replace(/\s*\|\s*浩辰 HaoChen\s*$/, "").trim();
      const cur = pages.get(path) || { path, title: "", count: 0 };
      cur.count += h.count;
      if (path === "/") cur.title = "首頁";
      else if (!cur.title && title) cur.title = title;
      pages.set(path, cur);
    }

    const pick = (r) => (r.stats || []).map((s) => ({ id: s.id || "", name: s.name || "", count: s.count }));
    const res = json({
      start, end,
      total: total.total,
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
