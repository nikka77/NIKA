import { fetchFandomProse } from '../lib/fandom.mjs';
const cas=[
  ['Bleach','Gunjou','gunjou'],
  ['Dragon Ball','Shuu','shuu'],
  ['One Piece','Bongou','bongou'],
  ['One Piece','Bungou','bungou'],
];
for(const [u,n,s] of cas){
  const p=await fetchFandomProse(u,n,{slug:s});
  console.log(`${n.padEnd(8)} → ${String(p?.title).padEnd(22)} par=${String(p?.resolvedBy).padEnd(24)} ${(p?.text??'').length} c | sameEntity=${p?.sameEntity} pageOeuvre=${p?.pageOeuvre??'null'}`);
}
