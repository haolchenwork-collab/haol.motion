// Password check shared by the /admin/ and /api/ middleware.
// ADMIN_PASSWORD is set in Cloudflare Pages > Settings > Variables and Secrets.
// The browser shows its own sign-in box; any user name works.

async function digest(s) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

// Compare hashes so the time taken does not depend on how much matched.
async function same(a, b) {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function requirePassword({ request, env, next }) {
  if (!env.ADMIN_PASSWORD) {
    return new Response("Admin password is not set.", { status: 500, headers: { "cache-control": "no-store" } });
  }
  const header = request.headers.get("Authorization") || "";
  if (header.startsWith("Basic ")) {
    let pass = "";
    try {
      const raw = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
      pass = raw.slice(raw.indexOf(":") + 1);
    } catch {}
    if (pass && (await same(pass, env.ADMIN_PASSWORD))) {
      const res = await next();
      const out = new Response(res.body, res);
      out.headers.set("cache-control", "no-store");
      out.headers.set("x-robots-tag", "noindex");
      return out;
    }
    // Slow down password guessing a little.
    await new Promise((r) => setTimeout(r, 1000));
  }
  return new Response("請輸入後台密碼。", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="haol.motion admin", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
