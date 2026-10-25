// Cloudflare Pages Function: GET /api/stats?range=7|30|90|all
// Reads visitor stats from the GoatCounter API for the /admin/ page.
//
// Environment variables (set in Cloudflare Pages > Settings > Variables):
//   GOATCOUNTER_TOKEN   secret, a GoatCounter API key with "Read statistics" only
//   ACCESS_TEAM_DOMAIN  e.g. haolmotion.cloudflareaccess.com
//   ACCESS_AUD          the Application Audience (AUD) tag of the Access app
//
// Cloudflare Access sits in front of /admin/* and /api/*. This function also
// checks the Access token itself, so the numbers stay private even if the
// Access application is misconfigured. Without the variables it refuses.

const GC = "https://haolmotion.goatcounter.com/api/v0";
const SINCE = "2026-10-12T00:00:00Z"; // tracking went live
const RANGES = { "7": 7, "30": 30, "90": 90 };

let jwksCache = null;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function b64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verifyAccess(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
  } catch {
    return false;
  }
  if (header.alg !== "RS256") return false;

  const issuer = "https://" + env.ACCESS_TEAM_DOMAIN;
  const findKey = () => jwksCache && jwksCache.keys.find((k) => k.kid === header.kid);
  // Refetch when stale, or when the key id is new (Access rotates its keys).
  if (!jwksCache || jwksCache.at < Date.now() - 3600e3 || !findKey()) {
    const r = await fetch(issuer + "/cdn-cgi/access/certs");
    if (!r.ok) return false;
    jwksCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  }
  const jwk = findKey();
  if (!jwk) return false;

  const key = await crypto.subtle.importKey(
    "jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64url(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) return false;

  const now = Date.now() / 1000;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  return payload.iss === issuer && aud.includes(env.ACCESS_AUD) &&
    typeof payload.exp === "number" && payload.exp > now;
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
  if (!env.GOATCOUNTER_TOKEN || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return json({ error: "not_configured" }, 500);
  }
  if (!(await verifyAccess(request, env))) return json({ error: "unauthorized" }, 401);

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
