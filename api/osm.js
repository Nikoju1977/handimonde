// HandiMonde — proxy Overpass same-origin (Vercel Serverless, Node).
// Le navigateur appelle /api/osm (aucun CORS), le serveur interroge les miroirs
// avec les bons en-tetes et bascule automatiquement en cas d'echec.

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://api.openstreetmap.fr/oapi/interpreter"
];

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  let q = "";
  try { const b = await readBody(req); q = (b && b.q) || ""; }
  catch (e) { res.status(400).json({ error: "bad json" }); return; }
  if (!q || q.length > 2000) { res.status(400).json({ error: "bad query" }); return; }

  for (const url of MIRRORS) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 30000);
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
      if (!r.ok) continue;
      const text = await r.text();
      let data; try { data = JSON.parse(text); } catch (e) { continue; }
      if (!data || !Array.isArray(data.elements)) continue;
      res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
      res.status(200).json(data);
      return;
    } catch (e) { /* miroir suivant */ }
  }
  res.status(502).json({ error: "all overpass mirrors failed" });
}
