// scripts/audit-chantier5-sections-orphelines.mjs — VÉRIFIER L'INSTRUMENT AVANT DE CRIER.
//
// L'instantané local dit que 15 lignes d'`akasha_sections` pointent vers deux `entry_id` absents
// d'`akasha_entries`. Or la migration déclare `references akasha_entries(id) on delete cascade` :
// ces lignes ne devraient pas pouvoir exister. Avant de conclure que la contrainte manque en prod,
// on redemande les deux identifiants à la base — une pagination ratée produirait exactement le même
// symptôme (leçon du 10/08 : suspecter d'abord SON instrument).
//
// Il ne modifie rien.
// Usage : node --env-file=.env.local scripts/audit-chantier5-sections-orphelines.mjs
import { clientSite } from '../lib/ops/db.mjs';

const db = clientSite();
const SUSPECTS = ['0f7ffcde-38ad-42fd-b753-5a3a75a066d3', '2ee26a98-2b25-468a-baec-edea614ade1f'];

const { data: fiches, error: e1 } = await db.from('akasha_entries').select('id, slug, name').in('id', SUSPECTS);
if (e1) throw new Error(e1.message);
console.log(`fiches trouvées pour ces deux identifiants : ${fiches.length}`, JSON.stringify(fiches));

const { data: secs, error: e2 } = await db.from('akasha_sections').select('id, entry_id, idx, titre').in('entry_id', SUSPECTS).order('id');
if (e2) throw new Error(e2.message);
console.log(`sections rattachées à ces identifiants : ${secs.length}`);
for (const s of secs) console.log(' ', s.id, s.entry_id.slice(0, 8), s.idx, JSON.stringify(s.titre));

// Compte total recompté côté serveur (HEAD) : pour vérifier que l'instantané n'a rien perdu.
const { count, error: e3 } = await db.from('akasha_sections').select('id', { count: 'exact', head: true });
if (e3) throw new Error(e3.message);
console.log(`total akasha_sections (compté par le serveur) : ${count}`);
const { count: c2, error: e4 } = await db.from('akasha_entries').select('id', { count: 'exact', head: true });
if (e4) throw new Error(e4.message);
console.log(`total akasha_entries (compté par le serveur) : ${c2}`);
