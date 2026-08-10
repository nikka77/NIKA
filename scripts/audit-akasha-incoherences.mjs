// scripts/audit-akasha-incoherences.mjs — CHANTIER 4 : ce qu'une fiche DÉCLARE contre ce qu'elle DIT.
//
// POURQUOI : trois vagues ont compté ce qui MANQUE (texte, image, arête). Rien n'avait encore
// comparé les champs d'une même fiche ENTRE EUX. Quatre familles sont mesurées ici :
//
//   F1 · TYPE / RÉSUMÉ CONTREDIT PAR LE TEXTE — le résumé annonce un genre que le descFr réfute
//        (« Équipage de pirates. » sur un archipel de l'East Blue).
//   F2 · ATTRIBUT INCOHÉRENT — une clé d'un autre type sur la fiche (scope « Équipage pirate » sur
//        un `place`), ou une valeur d'axe que la prose de la fiche contredit (village).
//   F3 · TEXTE CONTAMINÉ — le descFr parle d'une AUTRE entité (précédent fu-yamanaka, 08/08).
//   F4 · RÉSUMÉ QUI PROMET CE QUE LA PAGE N'A PAS — « … et N autres » alors que le graphe porte
//        un autre compte (cap `owners.slice(0, 40)` de build-akasha-naruto.mjs l.989).
//
// GARDES (leçons de la semaine, dans l'ordre où elles ont coûté cher) :
//  · toute lecture est PAGINÉE par 1000 avec `.order('id')` — un select nu s'arrête à 1000 en silence ;
//  · F3 lit la PROSE (summary, descFr), jamais un dump de `attributes` — une chaîne stockée par le
//    corpus n'est pas une forme employée par lui (leçon du 10/08) ;
//  · aucun seuil automatique : sous vingt désaccords on LIT, on ne seuille pas. Ce script RANGE,
//    il ne tranche pas — les corrections sont dans scripts/ops-reparer-incoherences-1008.mjs.
//
// Il ne modifie rien.
// Usage : node --env-file=.env.local scripts/audit-akasha-incoherences.mjs [chemin-sortie.json]
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
const sortie = process.argv[2] ?? `data/audits/incoherences-mesure-${horodatage}.json`;

const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order('id').range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const rels = await page('akasha_relations', 'id, from_entry, to_entry, relation');
console.log(`socle : ${entries.length} fiches · ${rels.length} arêtes`);

const attrs = (e) => e.attributes ?? {};
const descFr = (e) => (typeof attrs(e).descFr === 'string' ? attrs(e).descFr.trim() : '');
const premierePhrase = (t) => (t ? t.replace(/\s+/g, ' ').split(/(?<=[.!?])\s/)[0] : '');

// ── F4 · « et N autres » : ce que le résumé promet contre ce que le graphe porte ────────────────
const VERBE = {
  'porté par': 'possede', 'portée par': 'maitrise', 'réunit': 'appartient',
  'maîtrisée par': 'maitrise', 'maîtrisé par': 'maitrise',
};
// La page ne montre pas toutes les arêtes : OrganizationZone ne garde de `appartient` entrant que
// les cibles de type `character` (OrganizationZone.tsx l.40-41). Akatsuki reçoit 44 arêtes et
// n'affiche que 37 figures, les 7 autres étant des artefacts rangés dans « Arsenal ». Compter les
// arêtes brutes ferait mentir le compteur (leçon du 10/08 sur « Habité par · 449 »).
const parId = new Map(entries.map((e) => [e.id, e]));
const entrantes = new Map(); // id → { relation → n }
for (const r of rels) {
  if (!entrantes.has(r.to_entry)) entrantes.set(r.to_entry, {});
  const c = entrantes.get(r.to_entry);
  const cle = r.relation === 'appartient' && parId.get(r.from_entry)?.type !== 'character'
    ? 'appartient_hors_personnage' : r.relation;
  c[cle] = (c[cle] ?? 0) + 1;
}
const f4 = [];
let f4Total = 0;
for (const e of entries) {
  const s = e.summary ?? '';
  const m = /et\s+(\d+)\s+autres?\b/.exec(s);
  if (!m) continue;
  f4Total++;
  const mv = new RegExp(`(${Object.keys(VERBE).join('|')})\\s+(.*)$`).exec(s.slice(0, m.index));
  if (!mv) { f4.push({ slug: e.slug, anomalie: 'verbe inconnu', summary: s }); continue; }
  const noms = mv[2].split(',').map((x) => x.trim()).filter(Boolean);
  const princ = VERBE[mv[1]];
  const livre = entrantes.get(e.id)?.[princ] ?? 0;
  const promis = noms.length + Number(m[1]);
  if (promis === livre) continue;
  f4.push({
    slug: e.slug, type: e.type, relation: princ, nomsCites: noms.length, nAnnonce: Number(m[1]),
    promis, livre, ecart: promis - livre, aUnDescFr: descFr(e).length > 0,
    resumeVisible: descFr(e).length === 0, // `descFrVal ?? entry.summary` — page.tsx l.148
    summary: s,
  });
}

// ── F1 · le résumé générique d'un autre genre ──────────────────────────────────────────────────
// Le seul gabarit générique du corpus qui se retrouve hors de son type : « Équipage de pirates. »
// (scripts/build-akasha-universes.mjs l.649, repli quand l'API ne rend pas de description).
// Le test porte sur le GENRE de la copule (« X est un royaume »), jamais sur la simple présence
// d'un mot de lieu : « L'équipage de Drake … découvert sur l'archipel Sabaody » nomme un lieu sans
// en être un. Une MENTION n'est pas une IDENTITÉ (leçon du 10/08).
const GENRE_LIEU = /^(?:l[ea']|la|les|un|une|le)?\s*(archipel|[îi]le|royaume|ville|cité|village|pays|port|montagne|for[êe]t|r[ée]gion|territoire|continent|mer|corps c[ée]leste|nation|planète|contrée)\b/i;
const f1 = [];
for (const e of entries) {
  if ((e.summary ?? '').trim() !== 'Équipage de pirates.') continue;
  const t = descFr(e);
  const p1 = premierePhrase(t);
  const cop = /\b(?:est|était|fut|sont|étaient)\s+(.{0,40})/.exec(p1);
  // Deuxième porte, aussi citable : le SUJET de la phrase est déjà un lieu (« L'archipel des Organ
  // Islands … abrite la ville d'Orange Town ») — la copule n'est alors pas définitionnelle.
  const sujetLieu = GENRE_LIEU.test(p1.slice(0, 30));
  f1.push({
    slug: e.slug, name: e.name, type: e.type, category: attrs(e).category ?? null,
    scope: attrs(e).scope ?? null,
    prouveUnLieu: (Boolean(cop) && GENRE_LIEU.test(cop[1])) || sujetLieu,
    parQuoi: (cop && GENRE_LIEU.test(cop[1])) ? 'copule' : sujetLieu ? 'sujet' : null,
    genreLu: cop ? cop[1].slice(0, 40) : null,
    phrasePreuve: p1.slice(0, 220) || null,
  });
}

// ── F2 · attribut d'un autre type, et valeur d'axe que la prose contredit ───────────────────────
// (a) clés rendues BRUTES par EntityAttributes (label = clé) sur les types qui montent ce bloc.
const CHAMPS = {
  character: ['role', 'race', 'affiliation', 'alignment'], place: ['region', 'climate', 'coordinates'],
  artifact: ['material', 'origin', 'power_level'], profession: ['sector', 'skills'],
  status: ['rank', 'scope'], power: ['range', 'cost', 'element'], skill: ['discipline', 'level'],
};
const f2a = [];
for (const e of entries) {
  if (e.type === 'character' || e.type === 'status') continue; // EntityAttributes non monté (constat I)
  const a = attrs(e);
  for (const cle of Object.keys(CHAMPS)) {
    if (cle === e.type) continue;
    for (const k of CHAMPS[cle]) {
      if (CHAMPS[e.type].includes(k)) continue;
      if (a[k] == null || a[k] === '') continue;
      f2a.push({ slug: e.slug, type: e.type, cle: k, cleDuType: cle, valeur: String(a[k]).slice(0, 80) });
    }
  }
}
// (b) `village` contredit par la prose de la fiche elle-même.
// Les diminutifs comptent : « Genji est un Ancien de Kiri » atteste bien Kirigakure. Les deux
// bornes `\b` sont obligatoires — sans la seconde, « Ame » attestait « Ameyuri Ringo ».
const VILLAGES = {
  Konohagakure: ['Konohagakure', 'Konoha'], Sunagakure: ['Sunagakure', 'Suna'],
  Kirigakure: ['Kirigakure', 'Kiri'], Kumogakure: ['Kumogakure', 'Kumo'],
  Iwagakure: ['Iwagakure', 'Iwa'], Amegakure: ['Amegakure', 'Ame'],
  Otogakure: ['Otogakure', 'Oto'], Takigakure: ['Takigakure', 'Taki'],
};
const f2b = [];
for (const e of entries) {
  const v = attrs(e).village;
  const t = descFr(e);
  if (!v || !VILLAGES[v] || t.length < 40) continue;
  const cite = (n) => VILLAGES[n].some((x) => new RegExp(`\\b${x}\\b`).test(t));
  if (cite(v)) continue;
  const autres = Object.keys(VILLAGES).filter((n) => n !== v && cite(n));
  if (autres.length) f2b.push({ slug: e.slug, village: v, texteNomme: autres, phrasePreuve: premierePhrase(t).slice(0, 200) });
}

// ── F3 · texte contaminé : le sujet de la première phrase nomme une AUTRE fiche ─────────────────
const nu = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim().replace(/\s+/g, ' ');
const parNom = new Map();
for (const e of entries) {
  const k = `${e.universe}::${nu(e.name)}`;
  if (!parNom.has(k)) parNom.set(k, []);
  parNom.get(k).push(e);
}
const f3 = [];
for (const e of entries) {
  const t = descFr(e);
  if (t.length < 40) continue;
  const p1 = premierePhrase(t);
  const m = /^([A-ZÀ-Ý][\wÀ-ÿ'’\-.]*(?:\s+(?:D\.|de|du|des|la|le)?\s*[A-ZÀ-Ý][\wÀ-ÿ'’\-.]*){0,3})\s+(?:est|était|fut|sont|étaient)\b/.exec(p1);
  if (!m) continue;
  const sujet = nu(m[1]);
  const mien = nu(e.name);
  if (!sujet || sujet === mien) continue;
  // Fiche désambiguïsée « Nom (précision) » : le sujet EST le nom, sans la parenthèse → normal.
  if (nu(e.name.replace(/\s*\(.*\)\s*$/, '')) === sujet) continue;
  const autres = (parNom.get(`${e.universe}::${sujet}`) ?? []).filter((x) => x.id !== e.id);
  if (!autres.length) continue;
  f3.push({
    slug: e.slug, name: e.name, type: e.type, universe: e.universe,
    sujetDuTexte: m[1], fichesDeCeNom: autres.map((x) => ({ slug: x.slug, type: x.type })),
    resumeDitLaMemeChose: nu(e.summary ?? '').startsWith(sujet),
    phrasePreuve: p1.slice(0, 220), descFrSource: attrs(e).descFrSource ?? null,
  });
}

const trace = {
  chantier: 'chantier 4 — incohérences entre ce qu\'une fiche déclare et ce qu\'elle dit',
  quand: new Date().toISOString(),
  nature: 'DIAGNOSTIC. Aucune écriture. Lectures Supabase paginées par 1000 avec .order(\'id\').',
  socle: { fiches: entries.length, aretes: rels.length },
  F4_resumeQuiPromet: { fichesAvecLaFormule: f4Total, nonTenues: f4.length, lignes: f4 },
  F1_resumeDunAutreGenre: { fichesAuGabaritEquipage: f1.length, prouveesLieu: f1.filter((x) => x.prouveUnLieu).length, lignes: f1 },
  F2_attributIncoherent: { cleDunAutreType: f2a.length, villageContreditParLaProse: f2b.length, cles: f2a, villages: f2b },
  F3_texteContamine: { candidats: f3.length, lignes: f3 },
};
fs.writeFileSync(sortie, JSON.stringify(trace, null, 1));
console.log(`F4 « et N autres » : ${f4Total} fiches portent la formule, ${f4.length} ne la tiennent pas`);
console.log(`F1 « Équipage de pirates. » : ${f1.length} fiches, dont ${f1.filter((x) => x.prouveUnLieu).length} dont le descFr prouve un LIEU`);
console.log(`F2 clé d'un autre type : ${f2a.length} · village contredit : ${f2b.length}`);
console.log(`F3 texte dont le sujet est une autre fiche : ${f3.length} candidats (à LIRE, pas à seuiller)`);
console.log(`trace → ${sortie}`);
