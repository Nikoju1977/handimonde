// © 2026 Studio Niko Design — Niko (Nicolas Julienne). Signature : Studio Niko Design · Août 2026.
// HandiMonde — proxy geocodage Nominatim (Vercel Serverless, Node).
// Servi via /find (chemin neutre) pour contourner les bloqueurs sur /api.

export const maxDuration = 20;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  const q = (req.query && req.query.q) || "";
  if (!q || q.length > 200) { res.status(400).json({ error: "bad query" }); return; }
  const lang = (req.query && req.query.lang) || "fr";

  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=" +
      encodeURIComponent(lang) + "&q=" + encodeURIComponent(q);
    const r = await fetch(url, {
      headers: {
        "User-Agent": "HandiMonde/1.0 (accessibility map; github.com/Nikoju1977/handimonde)",
        "Accept": "application/json"
      },
      signal: ctrl.signal
    });
    clearTimeout(to);
    const text = await r.text();
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    res.setHeader("Content-Type", "application/json");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(502).json({ error: "geo failed" });
  }
}
