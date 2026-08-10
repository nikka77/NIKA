// scripts/akasha-op-preflight-rendu.mjs — RÈGLE 6 : AVANT d'écrire dans `akasha_relations`,
// vérifier que CETTE table se voit sur la page des types qu'on s'apprête à désisoler.
//
// La leçon du soir du 10/08 : 3 830 arêtes existaient dans le graphe et ne s'affichaient sur AUCUNE
// page. Le lot One Piece se répartit en character / place / artifact / status ; chacun part vers un
// gabarit DIFFÉRENT (CharacterZone, EntityZone, OrganizationZone). On ne suppose rien : pour chaque
// type on prend une fiche RÉELLE qui porte déjà une arête SORTANTE `appartient|habite|exerce`, on
// demande sa page au serveur de dev, et on cherche dans le HTML SERVI un lien <a href> vers le slug
// de la cible — pas la valeur dans la charge RSC (leçon du 10/08 sur `image_url` : un grep de la
// valeur répond « présent » même quand rien ne l'affiche).
//
// N'ÉCRIT RIEN. Usage : node --env-file=.env.local scripts/akasha-op-preflight-rendu.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientSite } from '../lib/ops/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const db = clientSite();
const BASE = process.env.NIKA_DEV_URL ?? 'http://localhost:3000';
const HORODATE = new Date().toISOString().replace(/[:.]/g, '-');

const page = async (t, s) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(t).select(s).range(d, d + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

console.log('→ lecture de la base (paginée)…');
const entries = await page('akasha_entries', 'id, slug, name, type, universe');
const rels = await page('akasha_relations', 'from_entry, to_entry, relation');
const parId = new Map(entries.map((e) => [e.id, e]));
console.log(`  ${entries.length} fiches · ${rels.length} arêtes`);

const NATURES = new Set(['appartient', 'habite', 'exerce']);
// Ce que les deux gabarits qui rendent ces arêtes ÉCRIVENT dans leur chip :
// `<span>{label} · </span>{name}` — CharacterZone (NATURES_APPARTENANCE) et EntityZone (libelle()).
// Le chip n'est PAS un <a href> mais un bouton qui ouvre la cible dans le canal : chercher un
// `href` répondait NON partout, y compris là où le lien se voit. On cherche donc le TEXTE rendu.
const LIBELLES = { appartient: ['Appartient à', 'Appartient'], habite: ['Réside', 'Habite'], exerce: ['Exerce'] };
const texteNu = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');

const temoins = {};
for (const r of rels) {
  if (!NATURES.has(r.relation)) continue;
  const de = parId.get(r.from_entry), vers = parId.get(r.to_entry);
  if (!de || !vers || de.universe !== 'One Piece') continue;
  if (temoins[de.type]) continue;
  temoins[de.type] = { de, vers, relation: r.relation };
}

const resultats = [];
for (const [type, t] of Object.entries(temoins)) {
  const url = `${BASE}/learn/akasha/${t.de.slug}`;
  const html = await fetch(url, { signal: AbortSignal.timeout(60_000) }).then((r) => r.text());
  const txt = texteNu(html);
  const attendus = LIBELLES[t.relation].map((l) => `${l} · ${t.vers.name}`);
  const chip = attendus.find((a) => txt.includes(a)) ?? null;
  const nomVu = txt.includes(t.vers.name);
  resultats.push({ type, fiche: t.de.name, slug: t.de.slug, relation: t.relation, cible: t.vers.name, cibleSlug: t.vers.slug, url, chipRendu: chip, nomPresentDansLeTexte: nomVu });
  console.log(`\n${type.toUpperCase()} — ${t.de.name} --${t.relation}--> ${t.vers.name}`);
  console.log(`  ${url}`);
  console.log(`  chip « ${attendus[0]} » RENDU : ${chip ? 'OUI' : 'NON'} · nom présent dans le texte rendu : ${nomVu ? 'oui' : 'non'}`);
}

const sortie = path.join(ROOT, `data/audits/op-preflight-rendu-${HORODATE}.json`);
fs.writeFileSync(sortie, JSON.stringify({ quand: new Date().toISOString(), base: BASE, ecritEnBase: false, resultats }, null, 1));
console.log(`\ntrace : ${path.relative(ROOT, sortie)}`);
