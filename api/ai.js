// HandiMonde — proxy LLM same-origin (Vercel Serverless, Node).
// BYOK : la cle de l'utilisateur transite par sa propre fonction Vercel (HTTPS)
// puis vers le fournisseur. Les API LLM bloquent les appels navigateur (CORS) ;
// ce relais cote serveur les rend utilisables. Aucune cle n'est stockee ici.

const PROVIDERS = {
  mistral:  { url: "https://api.mistral.ai/v1/chat/completions" },
  groq:     { url: "https://api.groq.com/openai/v1/chat/completions" },
  cerebras: { url: "https://api.cerebras.ai/v1/chat/completions" },
  gemini:   { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" }
};

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

  let b;
  try { b = await readBody(req); }
  catch (e) { res.status(400).json({ error: "bad json" }); return; }

  const prov = PROVIDERS[b && b.provider];
  if (!prov) { res.status(400).json({ error: "unknown provider" }); return; }
  if (!b.key || typeof b.key !== "string") { res.status(400).json({ error: "missing key" }); return; }
  if (!Array.isArray(b.messages)) { res.status(400).json({ error: "missing messages" }); return; }

  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 40000);
    const r = await fetch(prov.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + b.key },
      body: JSON.stringify({
        model: b.model,
        messages: b.messages,
        max_tokens: b.max_tokens || 320,
        temperature: b.temperature == null ? 0.4 : b.temperature
      }),
      signal: ctrl.signal
    });
    clearTimeout(to);
    const text = await r.text();
    res.status(r.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "ai upstream failed" });
  }
}
