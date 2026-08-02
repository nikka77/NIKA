// scripts/ops-curer-alias.mjs — LE CURATEUR D'ALIAS (rôle Claude n°2, activé le 02/08/2026).
//
// 470 noms irrésolus dans la base : nos registres (API japonaises, traductions françaises) ne
// partagent souvent aucun mot avec les titres anglais des wikis — « Cellule d'enquête Kira »
// ≡ Japanese Task Force, « Kyousuke » ≡ Kyosuke. La garde d'identité refuse, à raison.
//
// Le circuit en trois temps, calqué sur la curation manuelle de Death Note (15/20 confirmées) :
//   1. Claude PROPOSE le titre canon depuis sa connaissance de l'œuvre (par lots de 40 noms) ;
//   2. chaque proposition est SONDÉE contre le wiki réel (action=parse, redirections suivies) —
//      une hypothèse non confirmée est JETÉE, jamais écrite ;
//   3. les paires confirmées entrent dans data/alias-cures.json, où elles valent preuve
//      d'identité pour toute la flotte.
//
// Coût : ~1 appel Claude par 40 noms (abonnement via CLI, ou API si créditée).
// Usage : node --env-file=.env.local scripts/ops-curer-alias.mjs [--universe="One Piece"] [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { clientOps } from '../lib/ops/db.mjs';
import { WIKIS, ALIAS_REGISTRE } from './lib/fandom.mjs';

const execFile = promisify(execFileCb);
const supabase = clientOps();
const DRY = process.argv.includes('--dry');

// Battement de flotte : ce rôle s'annonce pour la console /ops (LA FLOTTE).
async function battreEnClaude(role, detail) {
  try {
    await supabase.from('ops_workers').upsert({
      id: `claude:${role}`, hote: 'claude', role: 'claude', pid: process.pid,
      detail, derniere_activite: new Date().toISOString(),
    });
  } catch { /* console aveugle, jamais bloquant */ }
}

const SEUL = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];

// 1) Le gisement : les noms que l'usine a refusés pour résolution.
const par = {};
for (let d = 0; ; d += 1000) {
  const { data } = await supabase.from('agent_results').select('payload,error')
    .eq('status', 'refused').or('error.ilike.%mauvaise entité%,error.ilike.%aucune source%,error.ilike.%homonyme%')
    .order('id').range(d, d + 999);
  for (const r of data ?? []) {
    const u = r.payload?.universe, n = r.payload?.name;
    if (!u || !n || !WIKIS[u]) continue;
    if (ALIAS_REGISTRE[u]?.[n]) continue;                      // déjà curé
    (par[u] = par[u] ?? new Set()).add(n);
  }
  if ((data?.length ?? 0) < 1000) break;
}

const registre = JSON.parse(readFileSync('data/alias-cures.json', 'utf8'));
let totalConfirmees = 0;

for (const [univers, noms] of Object.entries(par)) {
  if (SEUL && univers !== SEUL) continue;
  const liste = [...noms];
  console.log(`\n═══ ${univers} — ${liste.length} nom(s) irrésolus`);

  for (let i = 0; i < liste.length; i += 40) {
    const lot = liste.slice(i, i + 40);
    // 2) Claude propose. Consigne stricte : n'avancer que ce qu'il SAIT, jamais deviner —
    //    la sonde jette de toute façon les hypothèses fausses, mais autant ne pas les payer.
    const prompt = `Tu es expert de l'univers « ${univers} » (wiki : ${WIKIS[univers]}.fandom.com, en anglais).
Voici des noms de NOTRE registre (souvent français ou romanisés à la japonaise) que la
résolution automatique n'a pas su relier à une page du wiki. Pour chacun, donne le TITRE EXACT
de la page du wiki anglais qui traite de la MÊME entité — uniquement si tu le connais avec
certitude. Pièges classiques : traduction française (« Monde des Shinigami » → Shinigami Realm),
romanisation (« Kyousuke » → Kyosuke, « ou » → o, macrons), surnom vs vrai nom.
Si tu n'es pas sûr, OMETS le nom — une paire fausse coûte plus cher qu'une paire manquante.
Réponds UNIQUEMENT en JSON : {"paires": {"<notre nom>": "<titre wiki>", ...}}
NOMS : ${JSON.stringify(lot)}`;
    let brut = '';
    try {
      ({ stdout: brut } = await execFile('claude', ['-p', prompt, '--model', 'claude-haiku-4-5'],
        { timeout: 240_000, maxBuffer: 4 * 1024 * 1024, env: (({ ANTHROPIC_API_KEY: _cle, ...e }) => e)(process.env) }));
    } catch (e) { console.error(`  ✗ appel Claude : ${String(e.message).slice(0, 100)}`); continue; }
    let paires = {};
    try { paires = JSON.parse((brut.match(/\{[\s\S]*\}/) ?? ['{}'])[0]).paires ?? {}; } catch { /* lot perdu */ }
    console.log(`  lot ${i / 40 + 1} : ${Object.keys(paires).length} proposition(s) sur ${lot.length}`);

    // 3) La sonde tranche : parse réel, redirections suivies. Non confirmée = jetée.
    for (const [notre, titre] of Object.entries(paires)) {
      if (!lot.includes(notre) || typeof titre !== 'string' || !titre.trim()) continue;
      if (notre.trim().toLowerCase() === titre.trim().toLowerCase()) continue;   // rien à curer
      try {
        const r = await fetch(`https://${WIKIS[univers]}.fandom.com/api.php?action=parse&page=${encodeURIComponent(titre)}&prop=sections&redirects=1&format=json&formatversion=2&maxlag=5`,
          { headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (contact : tulbured06@gmail.com)' }, signal: AbortSignal.timeout(15_000) });
        const j = await r.json();
        let officiel = j?.parse?.title ?? null;
        if (!officiel) {
          // REPLI PAR RECHERCHE : le titre exact varie (« Usui Touge » vs « Usui Pass »), mais
          // la proposition de Claude est une bonne CLÉ de recherche. On n'accepte le premier
          // résultat que s'il partage un mot significatif (≥ 4 lettres) avec la proposition —
          // sans ce garde-fou, la recherche ramènerait n'importe quel article citant le nom.
          const sr = await fetch(`https://${WIKIS[univers]}.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(titre)}&srlimit=1&format=json&maxlag=5`,
            { headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (contact : tulbured06@gmail.com)' }, signal: AbortSignal.timeout(15_000) }).then((x) => x.json()).catch(() => null);
          const hit = sr?.query?.search?.[0]?.title;
          if (hit) {
            const mots = (x) => new Set(String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4));
            const a = mots(titre), b = mots(hit);
            if ([...a].some((w) => b.has(w))) officiel = hit;
          }
        }
        // GARDE DE NATURE (02/08, après la moisson) : un nom de GROUPE (clan, famille, équipe…)
        // curé vers la page d'un INDIVIDU est un faux ami — « Clan Terumī » → Mei Terumī avait
        // passé le recouvrement de mots. La preuve d'identité vaudrait pour la mauvaise entité.
        {
          const groupeNotre = /^(clan|famille|family|équipe|team|groupe)\b/i.test(notre);
          const groupeTitre = /(clan|family|team|group|corps|squad|division)/i.test(officiel ?? '');
          if (officiel && groupeNotre && !groupeTitre) {
            console.log(`    ✗ ${notre} → « ${officiel} » : groupe curé vers un individu (jeté)`);
            officiel = null;
          }
        }
        if (officiel) {
          registre[univers] = registre[univers] ?? {};
          registre[univers][notre] = officiel;
          totalConfirmees++;
          console.log(`    ✓ ${notre} → « ${officiel} »`);
        } else {
          console.log(`    ✗ ${notre} → « ${titre} » : introuvable (hypothèse jetée)`);
        }
      } catch { /* sonde muette : on ne cure pas sur un doute */ }
      await new Promise((x) => setTimeout(x, 200));
    }
  }
}

console.log(`\n${totalConfirmees} paire(s) confirmée(s) au total`);
if (!DRY && totalConfirmees) {
  writeFileSync('data/alias-cures.json', JSON.stringify(registre, null, 1) + '\n');
  console.log('✓ data/alias-cures.json mis à jour — les remplisseurs re-serviront ces fiches');
}
await battreEnClaude('curateur', `${totalConfirmees} paire(s) confirmée(s) ce passage`);
