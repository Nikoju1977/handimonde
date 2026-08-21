// HandiMonde — proxy Overpass same-origin (Vercel Serverless, Node).
// Supporte GET (?q=...) ET POST {q}. Le GET est privilegie cote client car
// certains navigateurs/reseaux mobiles bloquent ou figent les POST vers /api.
// Diagnostic : GET ?selftest=1 | ?debug=1 | ?log=...

export const maxDuration = 60;

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];
const SELFTEST_Q =
  '[out:json][timeout:25];nwr["wheelchair"~"^(yes|limited)$"](47.20,-1.58,47.23,-1.54);out center tags 60;';

function sleep(ms){ return new Promise((r)=>setTimeout(r,ms)); }

async function readBody(req){
  if (req.body !== undefined && req.body !== null)
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  return await new Promise((resolve,reject)=>{
    let d=""; req.on("data",(c)=>{ d+=c; if(d.length>1e6) req.destroy(); });
    req.on("end",()=>{ try{ resolve(JSON.parse(d||"{}")); }catch(e){ reject(e); } });
    req.on("error",reject);
  });
}
async function hit(url,q,attempts){
  try{
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),9000);
    const r=await fetch(url,{ method:"POST",
      headers:{ "Content-Type":"application/x-www-form-urlencoded","Accept":"application/json",
        "User-Agent":"HandiMonde/1.0 (accessibility map; github.com/Nikoju1977/handimonde)" },
      body:"data="+encodeURIComponent(q), signal:ctrl.signal });
    clearTimeout(to);
    if(!r.ok){ attempts.push(url+" -> HTTP "+r.status); return null; }
    const text=await r.text();
    let data; try{ data=JSON.parse(text); }catch(e){ attempts.push(url+" -> bad JSON"); return null; }
    if(!data || !Array.isArray(data.elements)){ attempts.push(url+" -> no elements"); return null; }
    return { mirror:url, data };
  }catch(e){ attempts.push(url+" -> "+(e&&e.name==="AbortError"?"timeout":"error")); return null; }
}
async function queryMirrors(q){
  const attempts=[]; let emptyFallback=null;
  for(let pass=0; pass<2; pass++){
    for(const url of MIRRORS){
      const ok=await hit(url,q,attempts);
      if(!ok) continue;
      if(ok.data.elements.length>0) return { ok:true, mirror:ok.mirror, data:ok.data, attempts };
      attempts.push(url+" -> empty(0)"); if(!emptyFallback) emptyFallback=ok;
    }
    if(pass===0) await sleep(1000);
  }
  if(emptyFallback) return { ok:true, mirror:emptyFallback.mirror, data:emptyFallback.data, attempts, empty:true };
  return { ok:false, attempts };
}
function sendData(res,out){
  if(out.ok){
    res.setHeader("Cache-Control","public, s-maxage=180, stale-while-revalidate=600");
    res.status(200).json(out.data);
  }else{
    res.status(502).json({ error:"all overpass mirrors failed", attempts:out.attempts });
  }
}

export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method==="OPTIONS"){ res.status(204).end(); return; }

  if(req.method==="GET"){
    const Q=req.query||{};
    if(Q.selftest){ const out=await queryMirrors(SELFTEST_Q);
      res.status(out.ok?200:502).json(out.ok?{ok:true,mirror:out.mirror,count:out.data.elements.length,empty:!!out.empty,attempts:out.attempts}:{ok:false,count:0,attempts:out.attempts}); return; }
    if(Q.debug){ const report=[]; for(const url of MIRRORS){ const a=[]; const ok=await hit(url,SELFTEST_Q,a);
        report.push(ok?{mirror:url,count:ok.data.elements.length,hasTags:!!(ok.data.elements[0]&&ok.data.elements[0].tags)}:{mirror:url,error:a[0]||"fail"}); }
      res.status(200).json({report}); return; }
    if(typeof Q.log==="string"){ console.log("[client] "+Q.log.slice(0,500)); res.status(200).json({ok:true}); return; }
    if(typeof Q.q==="string" && Q.q){
      if(Q.q.length>2000){ res.status(400).json({error:"bad query"}); return; }
      console.log("[osm] GET q.len="+Q.q.length);
      sendData(res, await queryMirrors(Q.q)); return;
    }
    res.status(400).json({ error:"missing q" }); return;
  }

  if(req.method==="POST"){
    let body={}; try{ body=await readBody(req); }catch(e){ res.status(400).json({error:"bad json"}); return; }
    if(body && typeof body.log==="string"){ console.log("[client] "+body.log.slice(0,500)); res.status(200).json({ok:true}); return; }
    const q=(body&&body.q)||"";
    if(!q || q.length>2000){ res.status(400).json({error:"bad query"}); return; }
    sendData(res, await queryMirrors(q)); return;
  }
  res.status(405).json({ error:"method not allowed" });
}
