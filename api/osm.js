// HandiMonde — proxy Overpass same-origin (Vercel Serverless, Node).
// Backends MONDIAUX uniquement (les extraits regionaux type osm.ch/osm.jp
// renvoient une liste vide hors de leur pays et faussaient le resultat).
// Un resultat vide est traite comme un echec tant qu'un autre miroir peut
// fournir des donnees ; on ne renvoie 0 que si TOUS sont vides.
// Diagnostic : GET /api/osm?selftest=1.

export const maxDuration = 60;

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];

const SELFTEST_Q =
  '[out:json][timeout:25];nwr["wheelchair"~"^(yes|limited)$"](47.20,-1.58,47.23,-1.54);out center tags 60;';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  }
  return await new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => { d += c; if (d.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

async function hit(url, q, attempts) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "HandiMonde/1.0 (accessibility map; github.com/Nikoju1977/handimonde)"
      },
      body: "data=" + encodeURIComponent(q),
      signal: ctrl.signal
    });
    clearTimeout(to);
    if (!r.ok) { attempts.push(url + " -> HTTP " + r.status); return null; }
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch (e) { attempts.push(url + " -> bad JSON"); return null; }
    if (!data || !Array.isArray(data.elements)) { attempts.push(url + " -> no elements"); return null; }
    return { mirror: url, data };
  } catch (e) {
    attempts.push(url + " -> " + (e && e.name === "AbortError" ? "timeout" : "error"));
    return null;
  }
}

async function queryMirrors(q) {
  const attempts = [];
  let emptyFallback = null; // resultat vide valide, garde en dernier recours
  for (let pass = 0; pass < 2; pass++) {
    for (const url of MIRRORS) {
      const ok = await hit(url, q, attempts);
      if (!ok) continue;
      if (ok.data.elements.length > 0) {
        return { ok: true, mirror: ok.mirror, data: ok.data, attempts };
      }
      attempts.push(url + " -> empty(0), on continue");
      if (!emptyFallback) emptyFallback = ok;
    }
    if (pass === 0) await sleep(1000);
  }
  if (emptyFallback) {
    return { ok: true, mirror: emptyFallback.mirror, data: emptyFallback.data, attempts, empty: true };
  }
  return { ok: false, attempts };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  if (req.method === "GET" && req.query && req.query.debug) {
    const report = [];
    for (const url of MIRRORS) {
      const attempts = [];
      const ok = await hit(url, SELFTEST_Q, attempts);
      if (ok) {
        const e0 = ok.data.elements[0] || null;
        report.push({
          mirror: url,
          count: ok.data.elements.length,
          firstType: e0 ? e0.type : null,
          hasTags: !!(e0 && e0.tags),
          hasWheelchair: !!(e0 && e0.tags && e0.tags.wheelchair),
          hasLatLon: !!(e0 && (e0.lat != null || (e0.center && e0.center.lat != null))),
          sampleKeys: e0 && e0.tags ? Object.keys(e0.tags).slice(0, 8) : []
        });
      } else {
        report.push({ mirror: url, error: attempts[0] || "fail" });
      }
    }
    res.status(200).json({ report });
    return;
  }

  if (req.method === "GET" && req.query && req.query.selftest) {
    const out = await queryMirrors(SELFTEST_Q);
    res.status(out.ok ? 200 : 502).json(
      out.ok ? { ok: true, mirror: out.mirror, count: out.data.elements.length, empty: !!out.empty, attempts: out.attempts }
             : { ok: false, count: 0, attempts: out.attempts });
    return;
  }

  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  let body = {};
  try { body = await readBody(req); }
  catch (e) { res.status(400).json({ error: "bad json" }); return; }
  if (body && typeof body.log === "string") {
    console.log("[client] " + body.log.slice(0, 500));
    res.status(200).json({ ok: true });
    return;
  }
  const q = (body && body.q) || "";
  if (!q || q.length > 2000) { res.status(400).json({ error: "bad query" }); return; }

  const out = await queryMirrors(q);
  if (out.ok) {
    console.log("[osm] OK " + out.mirror + " n=" + out.data.elements.length + (out.empty ? " (all empty)" : ""));
    res.setHeader("Cache-Control", "public, s-maxage=180, stale-while-revalidate=600");
    res.status(200).json(out.data);
  } else {
    console.log("[osm] FAIL " + JSON.stringify(out.attempts));
    res.status(502).json({ error: "all overpass mirrors failed", attempts: out.attempts });
  }
}
