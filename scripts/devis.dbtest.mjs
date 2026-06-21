// scripts/devis.dbtest.mjs — applique la migration devis dans un Postgres éphémère
// (pglite, WASM) et vérifie : colonne générée, trigger IA, contraintes accepte/main_oeuvre.
//   npm i --no-save @electric-sql/pglite && node scripts/devis.dbtest.mjs
// (RLS non testée ici : pglite tourne en superuser → policies créées mais bypass.)
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

let failures = 0;
const ok = (l) => console.log(`  ✓ ${l}`);
const fail = (l, d) => { failures++; console.error(`  ✗ ${l}`, d ?? ''); };
async function expectThrow(db, sql, params, label) {
  try { await db.query(sql, params); fail(label + ' — aurait dû échouer'); }
  catch (e) { ok(`${label} → rejeté (${String(e.message).split('\n')[0]})`); }
}

const db = new PGlite();

// Prérequis minimaux (fournis ailleurs par schema.sql en vrai).
await db.exec(`
  create schema if not exists auth;
  create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create table if not exists users (id uuid primary key default gen_random_uuid(), username text);
  create table if not exists pros (id uuid primary key default gen_random_uuid(), user_id uuid references users(id), domain text);
`);
ok('prérequis appliqués (auth.uid stub, users, pros)');

// DoD : la migration s'applique sans erreur.
const migration = readFileSync(new URL('../supabase/migrations/20260621_artisan_devis.sql', import.meta.url), 'utf8');
try { await db.exec(migration); ok('migration 20260621_artisan_devis.sql appliquée sans erreur'); }
catch (e) { fail('migration NON appliquée', e.message); console.log('\n❌'); process.exit(1); }

const { rows: [u] } = await db.query(`insert into users (username) values ('artisan1') returning id`);
const { rows: [p] } = await db.query(`insert into pros (user_id, domain) values ($1,'serv') returning id`, [u.id]);
ok('seed user + pro (domain=serv)');

// a) montant_ht généré
const { rows: [d] } = await db.query(`insert into devis (reference, artisan_id, date_validite) values ('DEV-1',$1,current_date+30) returning id`, [p.id]);
await db.query(`insert into devis_lignes (devis_id,type,designation,quantite,unite,prix_unitaire_ht,taux_tva,provenance,valide_par_pro) values ($1,'materiel','Carrelage',2,'m2',100,20,'saisi_pro',true)`, [d.id]);
await db.query(`insert into devis_lignes (devis_id,type,designation,quantite,unite,prix_unitaire_ht,taux_tva,provenance,valide_par_pro,taux_horaire) values ($1,'main_oeuvre','Pose',3,'heures',50,10,'saisi_pro',true,50)`, [d.id]);
const { rows: mh } = await db.query(`select montant_ht from devis_lignes where devis_id=$1 order by montant_ht`, [d.id]);
(mh.length === 2 && Number(mh[0].montant_ht) === 150 && Number(mh[1].montant_ht) === 200)
  ? ok('a) montant_ht généré = 150 (3×50) & 200 (2×100)')
  : fail('a) montant_ht', mh);

// b) IA validée + total_ttc → accepte OK
await db.query(`insert into devis_lignes (devis_id,type,designation,quantite,unite,prix_unitaire_ht,taux_tva,provenance,valide_par_pro) values ($1,'materiel','Colle IA',1,'u',5,20,'suggere_ia',true)`, [d.id]);
try { await db.query(`update devis set statut='accepte',total_ht=385,total_tva=61.5,total_ttc=446.5 where id=$1`, [d.id]); ok('b) accepte autorisé (IA validée + total_ttc présent)'); }
catch (e) { fail('b) accepte devrait passer', e.message); }

// c) ligne IA non validée → accepte bloqué (trigger)
const { rows: [d2] } = await db.query(`insert into devis (reference,artisan_id,date_validite) values ('DEV-2',$1,current_date+30) returning id`, [p.id]);
await db.query(`insert into devis_lignes (devis_id,type,designation,quantite,unite,prix_unitaire_ht,provenance,valide_par_pro) values ($1,'materiel','Suggestion IA',1,'u',10,'suggere_ia',false)`, [d2.id]);
await expectThrow(db, `update devis set statut='accepte',total_ttc=12 where id=$1`, [d2.id], 'c) accepte bloqué si ligne IA non validée (trigger)');
// …et envoye aussi
await expectThrow(db, `update devis set statut='envoye' where id=$1`, [d2.id], 'c2) envoye bloqué si ligne IA non validée (trigger)');

// d) accepte sans total_ttc → check
const { rows: [d3] } = await db.query(`insert into devis (reference,artisan_id,date_validite) values ('DEV-3',$1,current_date+30) returning id`, [p.id]);
await expectThrow(db, `update devis set statut='accepte' where id=$1`, [d3.id], 'd) accepte sans total_ttc bloqué (check)');

// e) main_oeuvre taux_horaire ≠ prix → check
await expectThrow(db, `insert into devis_lignes (devis_id,type,designation,quantite,unite,prix_unitaire_ht,taux_horaire) values ($1,'main_oeuvre','Bad',1,'heures',50,40)`, [d3.id], 'e) main_oeuvre taux_horaire≠prix bloqué (check)');

// f) date_validite < date_emission → check
await expectThrow(db, `insert into devis (reference,artisan_id,date_emission,date_validite) values ('DEV-4',$1,'2026-06-21','2026-06-01')`, [p.id], 'f) date_validite < date_emission bloqué (check)');

console.log(failures === 0 ? '\n✅ devis DB test : OK' : `\n❌ devis DB test : ${failures} échec(s)`);
process.exit(failures === 0 ? 0 : 1);
