import { fetchFandomProse } from '../lib/fandom.mjs';
for (const [u,n,s] of [['One Piece','Captain John','captain-john'],['One Piece','Don Achino','don-achino'],['Dragon Ball','Son Gohan','son-gohan']]) {
  const p = await fetchFandomProse(u,n,{slug:s});
  console.log(`\n=== ${n} → « ${p?.title} » (${p?.resolvedBy}, ${(p?.text??'').length} c)`);
  console.log('  redirections :', JSON.stringify(p?.redirections));
  console.log('  sections     :', JSON.stringify((p?.sections??[]).slice(0,12)));
  console.log('  identiteAttestee =', p?.identiteAttestee);
}
