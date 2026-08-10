// scripts/audit-akasha-etat.mjs — L'ÉTAT DES LIEUX D'AKASHA, MESURÉ, POUR NOURRIR LE CARNET.
//
// POURQUOI (10/08/2026)
// Dan demande une grande liste de choses à faire. Une liste écrite de mémoire vaut ce que vaut la
// mémoire : le plan de refonte annonçait 29 composants (il y en avait 44), 3 200 fiches (2 600) et
// 35,5 % d'isolées (12,6 %). Ce script mesure d'abord, pour que chaque ligne du carnet cite un
// chiffre qu'on peut recompter — et pour que la même commande dise plus tard si le chantier a servi.
//
// Il ne modifie rien.
// Usage : node --env-file=.env.local scripts/audit-akasha-etat.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';
import { UNIVERSE_TAXONOMY } from '../lib/akasha/universe-taxonomy.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();

const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, description, image_url, attributes');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const secs = await page('akasha_sections', 'entry_id');

const degre = new Map();
for (const r of rels) {
  degre.set(r.from_entry, (degre.get(r.from_entry) ?? 0) + 1);
  degre.set(r.to_entry, (degre.get(r.to_entry) ?? 0) + 1);
}
const avecSection = new Set(secs.map((s) => s.entry_id));

// Un résumé « de remplissage » : la phrase que l'usine écrit quand elle n'a rien à dire. On ne les
// devine pas, on les reconnaît à leur forme — courts et sans aucun fait propre.
const REMPLISSAGE = /^(personnage|lieu|objet|technique)\s+(secondaire|mineur|de l'univers)[^.]{0,60}\.?$/i;

const parUnivers = {};
for (const u of [...new Set(entries.map((e) => e.universe).filter(Boolean))]) {
  const lot = entries.filter((e) => e.universe === u);
  const taxo = UNIVERSE_TAXONOMY.find((t) => t.name === u);
  const axes = (taxo?.axes ?? []).map((a) => {
    const remplies = lot.filter((e) => typeof e.attributes?.[a.attr] === 'string' && e.attributes[a.attr].trim());
    const valeurs = new Set(remplies.map((e) => e.attributes[a.attr]));
    const curees = new Set(a.values.map((v) => v.v));
    return {
      attr: a.attr, label: a.label, fiches: remplies.length, valeurs: valeurs.size,
      horsListe: [...valeurs].filter((v) => !curees.has(v)).length,
    };
  });
  parUnivers[u] = {
    fiches: lot.length,
    sansImage: lot.filter((e) => !e.image_url).length,
    sansDescFr: lot.filter((e) => !e.attributes?.descFr).length,
    sansResume: lot.filter((e) => !e.summary?.trim()).length,
    resumeRemplissage: lot.filter((e) => REMPLISSAGE.test(String(e.summary ?? '').trim())).length,
    sansDossier: lot.filter((e) => !avecSection.has(e.id)).length,
    isolees: lot.filter((e) => !(degre.get(e.id) ?? 0)).length,
    axes,
  };
}

const parType = {};
for (const t of [...new Set(entries.map((e) => e.type))]) {
  const lot = entries.filter((e) => e.type === t);
  parType[t] = { fiches: lot.length, sansImage: lot.filter((e) => !e.image_url).length, isolees: lot.filter((e) => !(degre.get(e.id) ?? 0)).length };
}

// `description` doit porter le texte long ; mesurer combien de fois elle ne fait que redire `summary`.
const descRedondante = entries.filter((e) => e.description && e.summary && e.description.trim() === e.summary.trim()).length;
const descAbsente = entries.filter((e) => !e.description?.trim()).length;

const rapport = {
  chantier: 'état des lieux AKASHA', quand: new Date().toISOString(),
  total: entries.length, relations: rels.length, sections: secs.length,
  global: {
    sansImage: entries.filter((e) => !e.image_url).length,
    sansDescFr: entries.filter((e) => !e.attributes?.descFr).length,
    sansResume: entries.filter((e) => !e.summary?.trim()).length,
    resumeRemplissage: entries.filter((e) => REMPLISSAGE.test(String(e.summary ?? '').trim())).length,
    isolees: entries.filter((e) => !(degre.get(e.id) ?? 0)).length,
    sansDossier: entries.filter((e) => !avecSection.has(e.id)).length,
    descriptionRedondante: descRedondante,
    descriptionAbsente: descAbsente,
  },
  parUnivers, parType,
};

const sortie = path.join(ROOT, 'data/audits/akasha-etat.json');
fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1));

const g = rapport.global;
console.log(`${entries.length} fiches · ${rels.length} arêtes · ${secs.length} sections\n`);
console.log(`sans image ${g.sansImage} · sans descFr ${g.sansDescFr} · sans résumé ${g.sansResume} · résumé de remplissage ${g.resumeRemplissage}`);
console.log(`isolées ${g.isolees} · sans dossier ${g.sansDossier} · description = résumé ${g.descriptionRedondante} · description vide ${g.descriptionAbsente}\n`);
for (const [u, v] of Object.entries(parUnivers).sort((a, b) => b[1].fiches - a[1].fiches)) {
  console.log(`${u.padEnd(26)} ${String(v.fiches).padStart(5)} fiches · img-${String(v.sansImage).padStart(4)} · descFr-${String(v.sansDescFr).padStart(4)} · remplissage ${String(v.resumeRemplissage).padStart(4)} · isolées ${String(v.isolees).padStart(4)}`);
  for (const a of v.axes) console.log(`      ${a.attr.padEnd(14)} ${String(a.fiches).padStart(4)} fiches · ${String(a.valeurs).padStart(3)} valeurs · ${a.horsListe} hors liste`);
}
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
