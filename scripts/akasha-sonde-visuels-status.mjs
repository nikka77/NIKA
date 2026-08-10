// scripts/akasha-sonde-visuels-status.mjs — CHANTIER 2 : « les fiches status portent-elles un
// visuel que leur page n'affiche jamais ? »
//
// LECTURE SEULE. Aucune écriture en base. Écrit une trace horodatée dans data/audits/.
//
// Toute lecture est PAGINÉE (.range(d, d+999)) : un `.select()` nu plafonne SILENCIEUSEMENT à
// 1 000 lignes chez PostgREST (leçons 123, 192). Le corpus fait ~6 800 fiches, les `status` ~400 :
// la pagination sert autant à compter juste qu'à le prouver dans la trace.
import { writeFileSync, mkdirSync } from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const PAGE = 1000;

async function lireTout(db, table, colonnes, filtre = (q) => q) {
  const out = [];
  for (let d = 0; ; d += PAGE) {
    const { data, error } = await filtre(db.from(table).select(colonnes)).range(d, d + PAGE - 1);
    if (error) throw new Error(`${table} @${d} : ${error.message}`);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

const db = clientSite();

// 1. Tout le corpus (pour situer les status dans l'ensemble).
const toutes = await lireTout(db, 'akasha_entries', 'id,slug,name,type,universe,image_url,attributes');
console.log(`corpus paginé : ${toutes.length} fiches`);

const status = toutes.filter((e) => e.type === 'status');
const avecImage = status.filter((e) => typeof e.image_url === 'string' && e.image_url.trim() !== '');

console.log(`status : ${status.length} · avec image_url : ${avecImage.length}`);

// 2. Ventilation par univers et par « portée » (attributes.scope), qui est ce que la page affiche
//    déjà en pastille — c'est l'indice le plus direct de la NATURE du collectif.
const parUnivers = {};
const parScope = {};
for (const e of avecImage) {
  const u = e.universe ?? '(sans univers)';
  parUnivers[u] = (parUnivers[u] ?? 0) + 1;
  const sc = typeof e.attributes?.scope === 'string' ? e.attributes.scope : '(sans scope)';
  parScope[sc] = (parScope[sc] ?? 0) + 1;
}

// 3. Le puits de membres a-t-il de la matière ? (arêtes `appartient` entrantes de personnages —
//    exactement ce que lit OrganizationZone). On lit le graphe, paginé lui aussi.
const aretes = await lireTout(db, 'akasha_relations', 'source_id,target_id,relation');
console.log(`arêtes paginées : ${aretes.length}`);
const typeParId = new Map(toutes.map((e) => [e.id, e.type]));
const membresParStatus = new Map(); // id status -> Set(id personnage)
for (const r of aretes) {
  if (r.relation !== 'appartient') continue;
  if (typeParId.get(r.source_id) !== 'character') continue;
  if (typeParId.get(r.target_id) !== 'status') continue;
  if (!membresParStatus.has(r.target_id)) membresParStatus.set(r.target_id, new Set());
  membresParStatus.get(r.target_id).add(r.source_id);
}
const nbMembres = (e) => membresParStatus.get(e.id)?.size ?? 0;

// 4. Croisement image × membres — la question posée par le chantier : le puits garde-t-il un sens
//    quand l'image existe, ou l'image arrive-t-elle justement là où le puits est vide ?
const croise = {
  imageEtMembres: avecImage.filter((e) => nbMembres(e) > 0).length,
  imageSansMembre: avecImage.filter((e) => nbMembres(e) === 0).length,
  sansImageEtMembres: status.filter((e) => !avecImage.includes(e) && nbMembres(e) > 0).length,
  sansImageNiMembre: status.filter((e) => !avecImage.includes(e) && nbMembres(e) === 0).length,
};

// 5. Échantillon complet pour l'inspection visuelle (nature de l'image : pavillon, emblème,
//    photo de groupe). On garde l'URL MOT POUR MOT telle qu'elle est en base (leçon 230).
const echantillon = avecImage
  .map((e) => ({
    slug: e.slug,
    name: e.name,
    universe: e.universe,
    scope: typeof e.attributes?.scope === 'string' ? e.attributes.scope : null,
    membres: nbMembres(e),
    image_url: e.image_url,
  }))
  .sort((a, b) => b.membres - a.membres || a.slug.localeCompare(b.slug));

const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('data/audits', { recursive: true });
const chemin = `data/audits/visuels-status-sonde-${horodatage}.json`;
writeFileSync(
  chemin,
  JSON.stringify(
    {
      horodatage,
      lecture: 'paginée .range(d, d+999)',
      corpusScanné: toutes.length,
      arêtesScannées: aretes.length,
      status: status.length,
      statusAvecImage: avecImage.length,
      parUnivers,
      parScope,
      croise,
      echantillon,
    },
    null,
    2,
  ),
);

console.log('\npar univers :', parUnivers);
console.log('\npar scope :', parScope);
console.log('\ncroisement image × membres :', croise);
console.log(`\ntrace : ${chemin}`);
