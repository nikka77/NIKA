// scripts/seed-domains.ts — seed pros + listings réalistes Côte d'Azur pour les 5 domaines « vides ».
// Allume les pages /auto /rent /serv /learn /sec (+ le formulaire de devis SERV).
// Idempotent : upsert des pros par business_name (UNIQUE) ; les listings sont réinsérés à blanc par pro.
// Usage : PATH="/opt/homebrew/bin:$PATH" npx tsx --env-file=.env.local scripts/seed-domains.ts
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type Pro = { domain: string; business_name: string; description: string; phone: string; address: string; lat: number; lng: number; verified: boolean; rating: number; reviews: number };
const P = (domain: string, business_name: string, description: string, phone: string, address: string, lat: number, lng: number, rating: number, reviews: number, verified = false): Pro =>
  ({ domain, business_name, description, phone, address, lat, lng, verified, rating, reviews });

const PROS: Pro[] = [
  // ── AUTO ──
  P('auto', 'Riviera VTC', 'Chauffeurs VTC licenciés — aéroport, gares & soirées, 7j/7.', '+33 6 12 00 00 01', 'Nice', 43.7009, 7.2683, 4.9, 320, true),
  P('auto', 'Azur Dépannage 06', 'Remorquage et dépannage auto 24/7 sur toute la Côte d’Azur.', '+33 6 12 00 00 02', 'Nice', 43.7039, 7.2660, 4.7, 180),
  P('auto', 'Sun Auto Location', 'Location de véhicules — citadines à supercars, livraison incluse.', '+33 6 12 00 00 03', 'Cannes', 43.5528, 7.0174, 4.8, 140, true),
  // ── RENT ──
  P('rent', "Loc'Azur Matériel", 'Location de matériel sport, bricolage et événementiel.', '+33 6 12 00 00 11', 'Antibes', 43.5808, 7.1251, 4.8, 96, true),
  P('rent', 'Riviera Rent', 'Vélos électriques, paddles et matériel de plage à la journée.', '+33 6 12 00 00 12', 'Nice', 43.6950, 7.2710, 4.7, 128),
  P('rent', 'Côte Pro Outils', 'Outillage professionnel et matériel BTP à la journée.', '+33 6 12 00 00 13', 'Cagnes-sur-Mer', 43.6644, 7.1486, 4.6, 64),
  // ── SERV ──
  P('serv', 'SOS Plomberie 06', 'Plomberie d’urgence 24/7 — fuite, chauffe-eau, débouchage. Devis gratuit.', '+33 6 12 00 00 21', 'Nice', 43.7012, 7.2710, 4.8, 212, true),
  P('serv', 'Élec Riviera', 'Électricien certifié — mise aux normes, tableau, dépannage.', '+33 6 12 00 00 22', 'Nice', 43.7080, 7.2755, 4.9, 176, true),
  P('serv', "Jardins d'Azur", 'Entretien de jardins, élagage et création d’espaces verts.', '+33 6 12 00 00 23', 'Cannes', 43.5560, 7.0200, 4.9, 98, true),
  P('serv', 'Cap Couleur Peinture', 'Peinture intérieure & façades, finitions soignées.', '+33 6 12 00 00 24', 'Antibes', 43.5830, 7.1230, 4.8, 59),
  // ── LEARN ──
  P('learn', 'Nice Surf School', 'Cours de surf et paddle, tous niveaux, baie de Nice.', '+33 6 12 00 00 31', 'Nice', 43.6920, 7.2600, 4.9, 210, true),
  P('learn', 'Azur Languages', 'Cours d’anglais, italien et FLE avec professeurs natifs.', '+33 6 12 00 00 32', 'Nice', 43.7000, 7.2720, 4.8, 95),
  P('learn', 'Riviera Music Academy', 'Cours de guitare, piano et chant — Cannes.', '+33 6 12 00 00 33', 'Cannes', 43.5510, 7.0190, 4.7, 64),
  P('learn', "Coach Côte d'Azur", 'Coaching sportif & nutrition, à domicile ou en plein air.', '+33 6 12 00 00 34', 'Antibes', 43.5800, 7.1260, 4.9, 130, true),
  // ── SEC ──
  P('sec', 'Azur Sécurité', 'Gardiennage, agents événementiel et résidentiel.', '+33 6 12 00 00 41', 'Nice', 43.7020, 7.2690, 4.8, 88, true),
  P('sec', 'Côte Alarme', 'Installation d’alarmes et vidéosurveillance connectée.', '+33 6 12 00 00 42', 'Cannes', 43.5535, 7.0180, 4.7, 52),
  P('sec', 'Serrurier Express 06', 'Ouverture de porte et blindage 24/7.', '+33 6 12 00 00 43', 'Nice', 43.7005, 7.2670, 4.9, 203, true),
];

type Item = { title: string; price: number; description: string };
const LISTINGS: Record<string, Item[]> = {
  'Riviera VTC': [
    { title: 'Transfert aéroport Nice (NCE)', price: 45, description: 'Course privée vers/depuis l’aéroport, berline.' },
    { title: 'Chauffeur à disposition — 2 h', price: 90, description: 'Mise à disposition avec chauffeur, 2 heures.' },
  ],
  'Sun Auto Location': [
    { title: 'Tesla Model 3 — journée', price: 99, description: 'Électrique, autonomie 500 km, livraison incluse.' },
    { title: 'Fiat 500 Cabrio — journée', price: 59, description: 'Citadine décapotable, parfaite pour la Corniche.' },
  ],
  "Loc'Azur Matériel": [
    { title: 'Paddle gonflable — jour', price: 18, description: 'Pack complet pagaie + leash + sac.' },
    { title: 'Tente 4 places — jour', price: 22, description: 'Montage 2 min, idéale week-end.' },
  ],
  'Riviera Rent': [
    { title: 'Vélo électrique — jour', price: 35, description: 'VAE, autonomie 80 km, casque inclus.' },
    { title: 'Pack plage (parasol + 2 transats)', price: 15, description: 'À retirer ou livré sur la Prom.' },
  ],
  'Nice Surf School': [
    { title: 'Cours de surf — 1 h 30', price: 45, description: 'Encadré par un moniteur diplômé, planche fournie.' },
    { title: 'Stage paddle découverte', price: 35, description: 'Initiation 1 h, eaux calmes de la baie.' },
  ],
  'Azur Languages': [{ title: 'Cours d’anglais — 1 h', price: 30, description: 'En visio ou en présentiel, tous niveaux.' }],
  'Riviera Music Academy': [{ title: 'Cours de guitare — 1 h', price: 28, description: 'Débutant à confirmé, prêt d’instrument possible.' }],
  "Coach Côte d'Azur": [{ title: 'Séance de coaching individuel', price: 50, description: 'Bilan + programme personnalisé.' }],
  'Côte Alarme': [{ title: 'Installation alarme connectée', price: 290, description: 'Kit + pose + appli mobile.' }],
  'Azur Sécurité': [{ title: 'Agent de sécurité — soirée', price: 180, description: 'Événementiel, 5 h, agent qualifié.' }],
};

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Variables Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }
  let okPros = 0, okItems = 0;
  for (const p of PROS) {
    const row = { domain: p.domain, business_name: p.business_name, description: p.description, phone: p.phone, address: p.address, lat: p.lat, lng: p.lng, verified: p.verified, active: true, rating: p.rating, review_count: p.reviews };
    // Pas de contrainte UNIQUE sur business_name en base → check-then-insert/update (idempotent).
    const { data: existing } = await sb.from('pros').select('id').eq('business_name', p.business_name).maybeSingle();
    let data: { id: string } | null = null;
    if (existing) {
      await sb.from('pros').update(row).eq('id', existing.id);
      data = existing;
    } else {
      const { data: ins, error } = await sb.from('pros').insert(row).select('id').single();
      if (error || !ins) { console.error('  ✗', p.business_name, error?.message); continue; }
      data = ins;
    }
    okPros++;
    const items = LISTINGS[p.business_name] ?? [];
    await sb.from('listings').delete().eq('pro_id', data.id);
    if (items.length) {
      const { error: liErr } = await sb.from('listings').insert(items.map(it => ({ pro_id: data.id, domain: p.domain, title: it.title, description: it.description, price: it.price, available: true })));
      if (liErr) console.error('    ✗ listings', p.business_name, liErr.message); else okItems += items.length;
    }
    console.log(`  ✓ ${p.domain.toUpperCase().padEnd(5)} ${p.business_name} (${items.length} listing${items.length > 1 ? 's' : ''})`);
  }
  console.log(`\n✅ Seed terminé : ${okPros}/${PROS.length} pros · ${okItems} listings.`);
}
main().catch(e => { console.error(e); process.exit(1); });
