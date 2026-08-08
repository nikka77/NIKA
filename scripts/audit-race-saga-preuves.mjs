// scripts/audit-race-saga-preuves.mjs — RECONSTITUER LA PREUVE PERDUE (Dragon Ball, race/saga).
//
// POURQUOI (09/08/2026)
// Le chantier d'extraction du 08/08 a posé 42 valeurs (13 race, 29 saga) et écrit sa trace
// ligne-à-ligne… au même chemin que ses dry-runs. Le contrôle d'idempotence lancé juste après
// l'application a réécrit ce fichier avec un plan vide : les 42 phrases-preuves ont disparu, et
// le fichier n'était pas versionné. Une donnée juste dont la preuve est perdue redevient une
// donnée NON AUDITABLE — on ne peut plus distinguer, dans six mois, ce qui a été extrait d'une
// phrase de ce qui a été supposé.
//
// Ce script ne réécrit RIEN en base. Il relit chaque personnage Dragon Ball, rejoue les MÊMES
// extracteurs (importés du script d'origine, jamais recopiés — une preuve reconstituée par une
// copie de la regex ne prouverait que la copie) et range chaque valeur présente en base dans
// l'une de trois cases :
//   · `attestee`      — le texte de la fiche porte encore la phrase qui justifie la valeur ;
//   · `sansAttestation` — la valeur existe, le texte ne la démontre pas : c'est le lot curé à la
//     main AVANT ce chantier (attendu), ou une donnée à re-sourcer ;
//   · `divergente`    — le texte démontre une AUTRE valeur que celle en base : à instruire.
// Il recompte aussi, sur la population actuellement sans saga, les candidats bruts et le motif
// EXACT de chaque rejet — le chiffre « 36 candidats, 8 faux » du commentaire d'origine ne
// s'additionnait pas (8 rejets annoncés, 7 nommés) et n'était plus vérifiable.
//
// Usage : node --env-file=.env.local scripts/audit-race-saga-preuves.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { extractRace, extractSaga } from './akasha-db-race-saga-extraction.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

const chars = [];
for (let d = 0; ; d += 1000) {
  const { data, error } = await db.from('akasha_entries')
    .select('slug, name, attributes').eq('universe', 'Dragon Ball').eq('type', 'character')
    .order('slug').range(d, d + 999);
  if (error) { console.error(error.message); process.exit(1); }
  chars.push(...(data ?? []));
  if ((data?.length ?? 0) < 1000) break;
}

const preuves = { race: { attestee: [], sansAttestation: [], divergente: [] },
                  saga: { attestee: [], sansAttestation: [], divergente: [] } };
const candidatsSaga = { propre: [], rejeteParGarde: [], ambigu: [] };
let sansDescFr = 0;

for (const c of chars) {
  const a = c.attributes ?? {};
  const descFr = typeof a.descFr === 'string' ? a.descFr.trim() : '';
  if (!descFr) { sansDescFr++; }

  for (const [champ, extraire] of [['race', extractRace], ['saga', extractSaga]]) {
    const enBase = typeof a[champ] === 'string' ? a[champ] : null;
    const r = descFr ? extraire(descFr) : { value: null, reason: 'descFr absent' };
    if (enBase) {
      const ligne = { slug: c.slug, nom: c.name, valeur: enBase };
      if (r.value === enBase) preuves[champ].attestee.push({ ...ligne, preuve: r.evidence });
      else if (r.value) preuves[champ].divergente.push({ ...ligne, texteDemontre: r.value, preuve: r.evidence });
      else preuves[champ].sansAttestation.push({ ...ligne, motif: r.reason ?? 'aucune formulation reconnue dans descFr' });
    } else if (champ === 'saga' && descFr) {
      // Population encore SANS saga : c'est là que vivent les rejets de la garde, donc le
      // dénominateur honnête du taux d'erreur annoncé.
      const l = { slug: c.slug, nom: c.name };
      if (r.value) candidatsSaga.propre.push({ ...l, valeur: r.value, preuve: r.evidence });
      else if (r.reason?.startsWith('ambigu')) candidatsSaga.ambigu.push({ ...l, motif: r.reason });
      else if (r.rejected?.length) candidatsSaga.rejeteParGarde.push({ ...l, motif: r.reason });
    }
  }
}

const rapport = {
  chantier: 'preuves race/saga Dragon Ball (reconstitution)', quand: new Date().toISOString(),
  personnages: chars.length, sansDescFr,
  race: {
    enBase: preuves.race.attestee.length + preuves.race.sansAttestation.length + preuves.race.divergente.length,
    attestees: preuves.race.attestee.length, sansAttestation: preuves.race.sansAttestation.length,
    divergentes: preuves.race.divergente.length,
  },
  saga: {
    enBase: preuves.saga.attestee.length + preuves.saga.sansAttestation.length + preuves.saga.divergente.length,
    attestees: preuves.saga.attestee.length, sansAttestation: preuves.saga.sansAttestation.length,
    divergentes: preuves.saga.divergente.length,
  },
  candidatsSagaRestants: {
    propre: candidatsSaga.propre.length, rejeteParGarde: candidatsSaga.rejeteParGarde.length,
    ambigu: candidatsSaga.ambigu.length,
    nomsRejetes: candidatsSaga.rejeteParGarde.map((x) => x.nom),
    nomsAmbigus: candidatsSaga.ambigu.map((x) => x.nom),
  },
  detail: { preuves, candidatsSaga },
};

const sortie = path.join(ROOT, 'data/audits/dragon-ball-race-saga-preuves.json');
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

console.log(`${chars.length} personnages · ${sansDescFr} sans descFr`);
for (const champ of ['race', 'saga']) {
  const r = rapport[champ];
  console.log(`${champ.padEnd(5)} : ${r.enBase} en base → ${r.attestees} attestées par le texte · ${r.sansAttestation} sans attestation · ${r.divergentes} divergentes`);
}
const c = rapport.candidatsSagaRestants;
console.log(`\nsaga, population encore sans valeur : ${c.propre} propre(s) · ${c.rejeteParGarde} rejeté(s) par la garde · ${c.ambigu} ambigu(s)`);
console.log('  rejetés :', c.nomsRejetes.join(', ') || '—');
console.log('  ambigus :', c.nomsAmbigus.join(', ') || '—');
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
