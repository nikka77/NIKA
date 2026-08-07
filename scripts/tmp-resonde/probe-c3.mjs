const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const UA={'User-Agent':'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)'};
const t=JSON.parse((await import('node:fs')).default.readFileSync(new URL('../../data/audits/resonde-gardes-trace.json',import.meta.url),'utf8')).trace;
const maigres=[...new Map(t.filter(x=>x.motif_apres==='page Fandom absente ou trop maigre').map(x=>[x.name,x])).values()];
console.log(maigres.length+' pages « trop maigres » distinctes\n');
for (const m of maigres) {
  const u=`https://naruto.fandom.com/api.php?action=parse&page=${encodeURIComponent(m.titre_trouve)}&prop=wikitext&redirects=1&format=json&formatversion=2&maxlag=5`;
  const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(25000)}); await sleep(300);
  const j=r.ok?await r.json():null;
  const w=j?.parse?.wikitext??'';
  const soft=/\{\{\s*Soft ?[Rr]edirect/i.test(w);
  const cible=(w.match(/\{\{\s*Soft ?[Rr]edirect\s*\|([^}]*)\}\}/i)?.[1]??'').trim().slice(0,90);
  console.log(`${m.name.padEnd(26)} brut=${String(w.length).padEnd(5)} nettoyé=${String(m.taille).padEnd(4)} ${soft?'SOFT→ '+cible:'(pas de soft redirect) '+w.replace(/\n/g,' ').slice(0,110)}`);
}
