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

async function gc(env, path, params) {
  const url = GC + path + "?" + new URLSearchParams(params);
  const r = await fetch(url, { headers: { authorization: "Bearer " + env.GOATCOUNTER_TOKEN } });
  if (!r.ok) throw new Error("goatcounter " + path + " " + r.status);
  return r.json();
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

  try {
    // GoatCounter allows 4 requests per second per key.
    const [total, hits, refs, locs] = await Promise.all([
      gc(env, "/stats/total", q),
      gc(env, "/stats/hits", { ...q, limit: 100 }),
      gc(env, "/stats/toprefs", { ...q, limit: 10 }),
      gc(env, "/stats/locations", { ...q, limit: 10 }),
    ]);
    const sizes = await gc(env, "/stats/sizes", { ...q, limit: 6 });

    const pages = new Map();
    for (const h of hits.hits || []) {
      if (h.event) continue;
      const path = normPath(h.path);
      const title = (h.title || "").replace(/\s*\|\s*浩辰 HaoChen\s*$/, "").trim();
      const cur = pages.get(path) || { path, title: "", count: 0 };
      cur.count += h.count;
      if (!cur.title && title) cur.title = path === "/" ? "首頁" : title;
      pages.set(path, cur);
    }

    const pick = (r) => (r.stats || []).map((s) => ({ name: s.name || "（直接開啟）", count: s.count }));
    return json({
      start, end,
      total: total.total,
      daily: (total.stats || []).map((s) => ({ day: s.day, count: s.daily })),
      pages: [...pages.values()].sort((a, b) => b.count - a.count),
      refs: pick(refs),
      locations: pick(locs),
      sizes: pick(sizes),
    });
  } catch (e) {
    return json({ error: "upstream", detail: String(e.message || e) }, 502);
  }
}
