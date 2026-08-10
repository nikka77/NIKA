// scripts/mesure-og-repli.mjs — TAUX D'ERREUR DE LA RÈGLE DE REPLI, AVANT DE L'ÉCRIRE.
//
// La règle testée ici est celle que le rendu OpenGraph appliquera. Elle ne touche PAS la donnée :
// elle réécrit l'ADRESSE demandée, au moment du rendu, pour obtenir un format que satori accepte.
//
//   · static.wikia.nocookie.net → ajouter `format=png` (mesuré : le CDN sert alors du PNG,
//     en conservant le redimensionnement déjà présent dans l'URL) ;
//   · cdn.myanimelist.net       → `.webp` → `.jpg` (mesuré : le même fichier existe en JPEG) ;
//   · chemin relatif            → préfixer par l'origine du site (satori exige une URL absolue).
//
// On mesure sur 25 cas par hôte : format servi, poids, et échec éventuel. Au-delà de 5 % d'échec
// non couvert par le repli, la règle est à resserrer.
import { clientSite } from '../lib/ops/db.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const HORODATAGE = new Date().toISOString().replace(/[:.]/g, '-');
const TRACE = `data/audits/og-repli-${HORODATAGE}.json`;
const ACCEPTES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml']);
const ORIGINE = 'http://localhost:3000';

function magie(buf) {
  const A = new Uint8Array(buf);
  if ([255, 216, 255].every((e, t) => A[t] === e)) return 'image/jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((e, t) => A[t] === e)) return 'image/png';
  if ([71, 73, 70, 56].every((e, t) => A[t] === e)) return 'image/gif';
  if ([82, 73, 70, 70].every((e, t) => A[t] === e) && [87, 69, 66, 80].every((e, t) => A[t + 8] === e)) return 'image/webp';
  if ([60, 63, 120, 109, 108].every((e, t) => A[t] === e)) return 'image/svg+xml';
  return null;
}

// --- LA RÈGLE ------------------------------------------------------------------------------
function adresseServable(brut) {
  if (!brut) return null;
  if (brut.startsWith('data:')) return brut;
  if (!brut.startsWith('http')) return ORIGINE + (brut.startsWith('/') ? brut : '/' + brut);
  let u;
  try { u = new URL(brut); } catch { return null; }
  if (u.host.endsWith('wikia.nocookie.net')) { u.searchParams.set('format', 'png'); return u.toString(); }
  if (u.host === 'cdn.myanimelist.net' && /\.webp$/i.test(u.pathname)) { u.pathname = u.pathname.replace(/\.webp$/i, '.jpg'); return u.toString(); }
  return u.toString();
}

const sb = clientSite();
const lignes = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await sb.from('akasha_entries').select('id,slug,universe,image_url').order('id').range(d, d + 999);
  if (error) throw error;
  lignes.push(...data);
  if (data.length < 1000) break;
}
const avec = lignes.filter((l) => l.image_url && String(l.image_url).trim());
const hote = (u) => (u.startsWith('http') ? (() => { try { return new URL(u).host; } catch { return '(illisible)'; } })() : '(relatif)');
const parHote = {};
for (const l of avec) (parHote[hote(l.image_url)] ||= []).push(l);

const N = 25;
const res = {};
for (const [h, tab] of Object.entries(parHote)) {
  const pas = Math.max(1, Math.floor(tab.length / N));
  const ech = [];
  for (let i = 0; i < tab.length && ech.length < N; i += pas) ech.push(tab[i]);
  const cas = [];
  for (const l of ech) {
    const cible = adresseServable(l.image_url);
    try {
      const r = await fetch(cible, { signal: AbortSignal.timeout(25000) });
      const b = await r.arrayBuffer();
      const m = magie(b);
      cas.push({ slug: l.slug, avant: l.image_url, apres: cible, statut: r.status, servi: m, ko: b.byteLength / 1024, accepte: !!m && ACCEPTES.has(m) });
    } catch (e) { cas.push({ slug: l.slug, avant: l.image_url, apres: cible, erreur: String(e).slice(0, 120), accepte: false }); }
    process.stderr.write('.');
  }
  const ok = cas.filter((c) => c.accepte).length;
  const poids = cas.filter((c) => c.ko).map((c) => c.ko).sort((a, b) => a - b);
  res[h] = {
    fiches: tab.length, testes: cas.length, acceptes: ok, echecs: cas.length - ok,
    tauxEchec: +(((cas.length - ok) / cas.length) * 100).toFixed(1),
    poidsKoMedian: poids.length ? +poids[Math.floor(poids.length / 2)].toFixed(0) : null,
    poidsKoMax: poids.length ? +poids[poids.length - 1].toFixed(0) : null,
    formats: [...new Set(cas.map((c) => c.servi).filter(Boolean))],
    detail: cas,
  };
  process.stderr.write(`\n  ${h} → ${ok}/${cas.length} acceptés, médiane ${res[h].poidsKoMedian} Ko, max ${res[h].poidsKoMax} Ko\n`);
}

mkdirSync('data/audits', { recursive: true });
writeFileSync(TRACE, JSON.stringify({ horodatage: new Date().toISOString(), regle: adresseServable.toString(), parHote: res }, null, 2));
console.log('\n=== repli mesuré ===');
for (const [h, v] of Object.entries(res).sort((a, b) => b[1].fiches - a[1].fiches))
  console.log(`  ${h.padEnd(30)} ${String(v.fiches).padStart(5)} fiches · ${v.acceptes}/${v.testes} acceptés (${v.tauxEchec} % d'échec) · ${v.formats.join(', ')} · médiane ${v.poidsKoMedian} Ko / max ${v.poidsKoMax} Ko`);
console.log(`trace : ${TRACE}`);
