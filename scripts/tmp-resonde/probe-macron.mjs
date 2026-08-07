const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const UA={'User-Agent':'NIKA-AKASHA/1.0 (encyclopédie éducative ; contact : tulbured06@gmail.com)'};
async function taille(wiki,t){
  const u=`https://${wiki}.fandom.com/api.php?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&redirects=1&format=json&formatversion=2&maxlag=5`;
  const r=await fetch(u,{headers:UA,signal:AbortSignal.timeout(25000)});
  await sleep(300);
  if(!r.ok) return 'HTTP '+r.status;
  const j=await r.json();
  if(!j?.parse?.wikitext) return 'ABSENTE';
  return `${j.parse.title} — ${j.parse.wikitext.length} c`;
}
const cas=[
  ['bleach','Gunjou'],['bleach','Gunjō'],['bleach','Kūgo Ginjō'],
  ['dragonball','Shuu'],['dragonball','Shū'],['dragonball','Shu'],['dragonball','Mr. Shu'],
  ['onepiece','Bongou'],['onepiece','Bongō'],['onepiece','Bongo'],['onepiece','Bungo'],['onepiece','Bungou'],['onepiece','Bungō'],
];
for(const [w,t] of cas) console.log(w.padEnd(11), t.padEnd(14), '→', await taille(w,t));
