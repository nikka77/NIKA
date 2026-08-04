// scripts/ops-instantane.mjs — INSTANTANÉ DU CORPUS AKASHA, avant que l'usine ne le réécrive.
//
// POURQUOI (04/08/2026)
// L'usine applique ses productions en lecture-modification-écriture sur `akasha_entries.attributes`
// (un JSONB) : elle relit la fiche, ajoute sa section ou sa description, réécrit l'objet entier.
// Aucun état antérieur n'est conservé nulle part. Le 26/07, annuler 8 fiches fausses n'a marché
// que parce que les champs concernés étaient encore vides — à la deuxième génération empilée,
// ce geste devient impossible et une erreur devient définitive.
//
// Ce script prend un instantané complet des DEUX tables que l'usine écrit côté site, horodaté et
// compressé. Ce n'est pas une sauvegarde d'infrastructure (Supabase a la sienne) : c'est un point
// de retour applicatif, qu'on peut lire, comparer et rejouer champ par champ.
//
// Usage : node --env-file=.env.local scripts/ops-instantane.mjs [--dir=~/nika-instantanes] [--garder=14]
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import zlib from 'node:zlib';
import { clientSite } from '../lib/ops/db.mjs';

const arg = (n, d = null) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=') ?? d;
const DIR = (arg('dir') ?? path.join(os.homedir(), 'nika-instantanes')).replace(/^~/, os.homedir());
const GARDER = Number(arg('garder', 14));

// L'horodatage vient du système : un instantané doit dire QUAND il a été pris, sinon on ne sait
// pas lequel précède l'erreur qu'on cherche à annuler.
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(DIR, { recursive: true });

const s = clientSite();
async function tout(table, colonnes) {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await s.from(table).select(colonnes).order('id').range(d, d + 999);
    if (error) { console.error(`✗ ${table} :`, error.message); process.exit(1); }
    out.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
    if (out.length % 5000 === 0) console.log(`  … ${table} : ${out.length}`);
  }
  return out;
}

const entries = await tout('akasha_entries', 'id,slug,type,name,universe,summary,description,image_url,attributes,rarity');
const relations = await tout('akasha_relations', '*');

const corps = JSON.stringify({ pris_le: new Date().toISOString(), entries, relations });
const fichier = path.join(DIR, `akasha-${stamp}.json.gz`);
fs.writeFileSync(fichier, zlib.gzipSync(corps, { level: 9 }));

const octets = fs.statSync(fichier).size;
console.log(`✓ instantané : ${fichier}`);
console.log(`  ${entries.length} entrée(s) · ${relations.length} relation(s) · ${(octets / 1048576).toFixed(1)} Mo compressés`);

// Rotation : un instantané qu'on ne purge jamais finit par remplir le disque de la machine qu'il
// devait protéger.
const anciens = fs.readdirSync(DIR).filter((f) => /^akasha-.*\.json\.gz$/.test(f)).sort();
for (const f of anciens.slice(0, Math.max(0, anciens.length - GARDER))) {
  fs.unlinkSync(path.join(DIR, f));
  console.log(`  – purgé : ${f}`);
}
console.log(`  ${Math.min(anciens.length, GARDER)} instantané(s) conservé(s) sur ${GARDER}`);
