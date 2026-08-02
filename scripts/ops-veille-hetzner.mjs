// scripts/ops-veille-hetzner.mjs — SENTINELLE DE RESTOCK Hetzner (30/07/2026, choix Dan).
// Contexte : la gamme économique (CAX11 7,19 €, CX23 6,59 €) est épuisée partout en Europe ;
// l'usine tourne sur un CPX22 à 23,99 € facturé à l'heure EN ATTENDANT. Cette sentinelle
// interroge l'API (token lecture seule) et alerte sur WhatsApp dès qu'une cible revient —
// on migre alors le nœud (sans état → 30 min) et on divise la facture par 3.
// Anti-spam : une alerte par cible et par 24 h (mémo dans ops_quotas via le guichet jour).
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { envoyerOuParquer } from './lib/whatsapp.mjs';

const supabase = clientOps();
const CIBLES = ['cax11', 'cx23', 'cax21', 'cx33'];
const LIEUX = ['nbg1', 'fsn1', 'hel1'];

const r = await fetch('https://api.hetzner.cloud/v1/datacenters', {
  headers: { Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}` },
});
if (!r.ok) { console.error('API Hetzner:', r.status); process.exit(1); }
const { datacenters } = await r.json();

const t = await fetch('https://api.hetzner.cloud/v1/server_types?per_page=50', {
  headers: { Authorization: `Bearer ${process.env.HETZNER_API_TOKEN}` },
});
const { server_types } = await t.json();
const idVersNom = new Map(server_types.map((s) => [s.id, s.name]));

const dispo = [];
for (const dc of datacenters) {
  const lieu = dc.location?.name;
  if (!LIEUX.includes(lieu)) continue;
  for (const id of dc.server_types?.available ?? []) {
    const nom = idVersNom.get(id);
    if (CIBLES.includes(nom)) dispo.push(`${nom} @ ${lieu}`);
  }
}

if (!dispo.length) { console.log('veille : rien en stock parmi', CIBLES.join(', ')); process.exit(0); }

// Anti-spam : le guichet jour du budget sert de mémo « déjà alerté aujourd hui ».
const { data: ok } = await supabase.rpc('quota_consommer', {
  p_fournisseur: 'veille-hetzner:jour', p_requetes: 1, p_jetons: 0,
  p_limite_requetes: 1, p_limite_jetons: 1, p_fenetre_secondes: 86_400,
});
if (ok === false) { console.log('déjà alerté aujourd hui —', dispo.join(' · ')); process.exit(0); }

const msg = `🎯 RESTOCK Hetzner : ${dispo.join(' · ')} — migre le nœud pour diviser la facture par ~3 (dis « migre l'usine » à Claude).`;
await envoyerOuParquer(msg);
console.log('alerté :', dispo.join(' · '));
