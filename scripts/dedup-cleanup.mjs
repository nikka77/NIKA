// scripts/dedup-cleanup.mjs — supprime en base les fiches doublons fusionnées par le build.
// Après reseed (qui a écrit les keepers avec attributs fusionnés + relations remappées), les
// anciennes fiches doublons restent orphelines : on migre leurs éventuelles relations puis on
// les supprime. Lit les manifestes data/akasha-merges-*.json. Requiert SUPABASE_SERVICE_ROLE_KEY.
import { readFileSync, existsSync } from 'node:fs';

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error('✗ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (--env-file=.env.local).'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const REST = `${URL_BASE}/rest/v1`;

const merges = [];
for (const f of ['data/akasha-merges-universes.json', 'data/akasha-merges-naruto.json']) {
  if (existsSync(f)) merges.push(...JSON.parse(readFileSync(f, 'utf8')));
}
if (!merges.length) { console.log('Aucune fusion à nettoyer.'); process.exit(0); }

async function idOf(slug) {
  const r = await fetch(`${REST}/akasha_entries?slug=eq.${encodeURIComponent(slug)}&select=id`, { headers: H });
  const j = await r.json();
  return j?.[0]?.id ?? null;
}

let migrated = 0, deleted = 0, missing = 0;
for (const m of merges) {
  const dupeId = await idOf(m.from);
  if (!dupeId) { missing++; continue; } // déjà supprimé ou jamais seedé
  const keeperId = await idOf(m.to);
  if (keeperId) {
    // Migrer les relations résiduelles du doublon vers le keeper (les keeper-relations sont déjà seedées → on supprime plutôt les doublonnantes).
    await fetch(`${REST}/akasha_relations?from_entry=eq.${dupeId}`, { method: 'DELETE', headers: H });
    await fetch(`${REST}/akasha_relations?to_entry=eq.${dupeId}`, { method: 'DELETE', headers: H });
    migrated++;
  }
  const del = await fetch(`${REST}/akasha_entries?id=eq.${dupeId}`, { method: 'DELETE', headers: { ...H, Prefer: 'return=minimal' } });
  if (del.ok) deleted++;
  else console.warn('  ⚠ delete échoué pour', m.from, await del.text());
}
console.log(`✓ dédup-cleanup : ${deleted} fiches supprimées, ${migrated} nettoyées de leurs relations, ${missing} déjà absentes (sur ${merges.length} fusions).`);
