// scripts/lib/ancrage.mjs — ancrage factuel HHEM, partagé entre le batch de nuit
// (ops-score-ancrage.mjs) et le gate ⚡ du worker (agent-worker.mjs). Un seul endroit
// pour les phrases et l'appel Python : les deux chemins ne peuvent plus diverger.
//
// HHEM = test d'ancrage STRICT (mesure du 25/07) : score haut = fait étayé par la source ;
// score bas ≠ faux (les inférences légitimes notent ~0). D'où la règle d'usage : signal
// POSITIF pour ouvrir l'autonomie, jamais un motif de rejet — une fiche à score bas va
// simplement dans la pile de Dan.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { access, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { splitPreuves, termeAnglais } from './akasha-axes.mjs';
import { fetchFandomProse } from './fandom.mjs';

const run = promisify(execFile);
// fileURLToPath (pas .pathname) : le projet vit dans iCloud, dont le chemin contient des
// espaces — .pathname les rend « %20 » et spawn échoue avec ENOENT.
const PY = fileURLToPath(new URL('../../.ops-venv/bin/python', import.meta.url));
const SCORER = fileURLToPath(new URL('../hhem/score.py', import.meta.url));

/** Attributs → phrases naturelles : HHEM juge des PHRASES, pas des « clé = valeur ». */
export const PHRASES = {
  village: (n, v) => `${n} is a shinobi of ${v}.`,
  clan: (n, v) => `${n} belongs to the ${v} clan.`,
  rank: (n, v) => `${n} holds the ninja rank of ${v}.`,
  faction: (n, v) => `${n} belongs to the ${v} faction.`,
  crew: (n, v) => `${n} is a member of the crew ${v}.`,
  fruit_type: (n, v) => `${n} ate a Devil Fruit of the ${v} type.`,
  race: (n, v) => `${n} is a ${v}.`,
  division: (n, v) => `${n} serves in the ${v} of the Gotei 13.`,
  saga: (n, v) => `${n} appears in the ${v}.`,
  nen: (n, v) => `${n} is a Nen user of the ${v} category.`,
  partie: (n, v) => `${n} appears in ${v} of JoJo's Bizarre Adventure.`,
  camp: (n, v) => `${n} belongs to the ${v} camp.`,
  affiliation: (n, v) => `${n} races for the team ${v}.`,
  col: (n, v) => `${n} races on ${v}.`,
};

/** Une production → affirmations vérifiables [{id, name, source, claim}]. */
export function construireAffirmations(row, source) {
  const p = row.payload ?? {};
  const items = [];
  if (row.task_type === 'akasha_attrs') {
    const { valeurs } = splitPreuves(row.result);
    for (const [attr, v] of Object.entries(valeurs)) {
      if (!v || v === 'inconnu' || !PHRASES[attr]) continue;
      items.push({ id: `${row.id}:${attr}`, name: p.name, source, claim: PHRASES[attr](p.name, termeAnglais(v)) });
    }
  } else if (row.result?.descFr) {
    items.push({ id: `${row.id}:descFr`, name: p.name, source, claim: row.result.descFr });
  }
  return items;
}

let hhemAbsentAnnonce = false;
// MUTEX : un seul processus Python HHEM à la fois — chaque instance charge ~1 Go de RAM,
// et à concurrence élevée (--conc=8) plusieurs applications simultanées feraient OOM le
// VPS (3,8 Go). Les appels concurrents font la queue (~9 s chacun, mesuré sur CX23).
let tourHHEM = Promise.resolve();
/** Note un lot d'affirmations. Rend Map(id → score), ou null si HHEM est indisponible
 *  (venv absent, Python en erreur) — l'appelant reste alors sur son comportement actuel. */
export function scorerHHEM(items) {
  const tour = tourHHEM.then(() => scorerHHEMSeul(items));
  tourHHEM = tour.catch(() => {});
  return tour;
}
async function scorerHHEMSeul(items) {
  if (!items.length) return new Map();
  try { await access(PY); } catch {
    if (!hhemAbsentAnnonce) { console.log('  ⚓ HHEM indisponible (.ops-venv absent) — ancrage non noté'); hhemAbsentAnnonce = true; }
    return null;
  }
  // Fichier temporaire plutôt que stdin : execFile n'a PAS d'option `input` (25/07).
  const tmp = join(tmpdir(), `nika-hhem-${process.pid}-${Date.now()}.json`);
  try {
    await writeFile(tmp, JSON.stringify(items.map(({ id, source, claim }) => ({ id, source, claim }))));
    const { stdout } = await run(PY, [SCORER, tmp], { maxBuffer: 32 * 1024 * 1024, timeout: 180_000 });
    return new Map(JSON.parse(stdout).map((s) => [s.id, s.score]));
  } catch (e) {
    console.log('  ⚓ HHEM en erreur — ancrage non noté :', String(e.message ?? e).slice(0, 120));
    return null;
  } finally { await unlink(tmp).catch(() => {}); }
}

/** Score d'ancrage d'UNE production : { min, pire } (son affirmation la MOINS étayée),
 *  ou null si rien n'est vérifiable (type sans phrases, pas de source, HHEM absent). */
export async function scoreAncrageProduction(row) {
  const p = row.payload ?? {};
  if (row.task_type !== 'akasha_attrs' && !row.result?.descFr) return null;   // rien à phraser
  const page = await fetchFandomProse(p.universe, p.name).catch(() => null);
  if (!page?.text) return null;
  const items = construireAffirmations(row, page.text.slice(0, 4000));
  if (!items.length) return null;
  const scores = await scorerHHEM(items);
  if (!scores) return null;
  let min = null;
  let pire = null;
  for (const it of items) {
    const s = scores.get(it.id) ?? 0;
    if (min === null || s < min) { min = s; pire = it.claim; }
  }
  return { min, pire };
}
