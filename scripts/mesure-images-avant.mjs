// scripts/mesure-images-avant.mjs — COMPTER, PAGINÉ, les fiches sans visuel.
// Lecture seule. Aucun select nu : un select non paginé s'arrête à 1000 lignes SANS ERREUR.
// Usage : node --env-file=.env.local scripts/mesure-images-avant.mjs
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const pageAll = async (sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from('akasha_entries').select(sel).order('id').range(d, d + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const tout = await pageAll('id,slug,name,type,universe,image_url');
const sans = tout.filter((e) => !e.image_url);

const parUnivers = new Map();
for (const e of sans) parUnivers.set(e.universe, (parUnivers.get(e.universe) ?? 0) + 1);
const parUniversType = new Map();
for (const e of sans) {
  const k = `${e.universe} · ${e.type}`;
  parUniversType.set(k, (parUniversType.get(k) ?? 0) + 1);
}

console.log(`total fiches : ${tout.length}`);
console.log(`avec image   : ${tout.length - sans.length}`);
console.log(`SANS image   : ${sans.length}`);
console.log('— par univers —');
for (const [u, n] of [...parUnivers].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(5), u);
console.log('— par univers · type (top 20) —');
for (const [k, n] of [...parUniversType].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(String(n).padStart(5), k);
