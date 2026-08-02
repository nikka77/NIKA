// scripts/ops-redacteur-sans-source.mjs — LE RÉDACTEUR DES SANS-SOURCE (rôle Claude n°3, 02/08).
//
// Certaines entités n'ont AUCUNE page wiki propre — figurants, concepts secondaires — mais
// vivent en MENTIONS éparses sur d'autres pages. L'usine ne peut rien pour elles (pas de
// source = garde fermée), et c'est correct. Ce rôle fait ce que Dan et Claude ont fait à la
// main le 02/08 pour cinq fiches Death Note : récolter les mentions par recherche plein texte,
// rédiger 2 à 4 phrases UNIQUEMENT depuis ces extraits, signer et sourcer.
//
// La signature est la règle : descFrSource dit toujours QUI a écrit et DEPUIS QUOI.
// Si les mentions ne suffisent pas, Claude répond « impossible » et la fiche reste vierge —
// une fiche vide vaut mieux qu'une fiche inventée.
//
// Usage : node --env-file=.env.local scripts/ops-redacteur-sans-source.mjs
//         [--universe="Death Note"] [--limit=10] [--dry]
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { WIKIS, ALIAS_REGISTRE } from './lib/fandom.mjs';

const execFile = promisify(execFileCb);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
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

const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 10);
const UNIVERSE = process.argv.find((a) => a.startsWith('--universe='))?.split('=')[1];
const H = { headers: { 'User-Agent': 'NIKA-AKASHA/1.0 (contact : tulbured06@gmail.com)' } };
const SIGNE = 'claude-haiku-4-5 (rédacteur sans-source)';

// Candidats : refusées « aucune source exploitable », toujours sans descFr, PAS déjà curées
// (le Curateur passe avant — s'il a trouvé la page, l'usine classique fera mieux que nous).
const refuses = new Map();
for (let d = 0; ; d += 1000) {
  const { data } = await supabase.from('agent_results').select('payload')
    .eq('status', 'refused').or('error.ilike.%aucune source%,error.ilike.%absente ou trop maigre%,error.ilike.%trop maigre%').order('id').range(d, d + 999);
  for (const r of data ?? []) {
    const u = r.payload?.universe, n = r.payload?.name;
    if (!u || !n || !WIKIS[u] || ALIAS_REGISTRE[u]?.[n]) continue;
    if (UNIVERSE && u !== UNIVERSE) continue;
    refuses.set(`${u}|${n}`, { universe: u, name: n });
  }
  if ((data?.length ?? 0) < 1000) break;
}
const candidats = [];
for (const { universe, name } of refuses.values()) {
  const { data: e } = await supabase.from('akasha_entries')
    .select('slug, name, summary, attributes').eq('universe', universe).eq('name', name).maybeSingle();
  if (e && !e.attributes?.descFr) candidats.push({ ...e, universe });
  if (candidats.length >= LIMIT) break;
}
console.log(`${candidats.length} fiche(s) sans source à tenter${UNIVERSE ? ` [${UNIVERSE}]` : ''}`);

let redigees = 0;
for (const c of candidats) {
  // 1) Récolte : les 3 meilleures pages citant le nom, fenêtres de ±450 caractères par mention.
  const sr = await fetch(`https://${WIKIS[c.universe]}.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(`"${c.name}"`)}&srlimit=3&format=json&maxlag=5`, H)
    .then((x) => x.json()).catch(() => null);
  const pages = (sr?.query?.search ?? []).map((x) => x.title);
  const mentions = [];
  for (const titre of pages) {
    const j = await fetch(`https://${WIKIS[c.universe]}.fandom.com/api.php?action=parse&page=${encodeURIComponent(titre)}&prop=wikitext&redirects=1&format=json&formatversion=2&maxlag=5`, H)
      .then((x) => x.json()).catch(() => null);
    const texte = String(j?.parse?.wikitext ?? '').replace(/\{\{[^{}]*\}\}/g, '').replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1').replace(/\s+/g, ' ');
    const bas = texte.toLowerCase();
    let i = -1, prises = 0;
    while (prises < 3 && (i = bas.indexOf(c.name.toLowerCase(), i + 1)) >= 0) {
      mentions.push(`[${titre}] …${texte.slice(Math.max(0, i - 450), i + 450)}…`);
      prises++;
    }
    await new Promise((x) => setTimeout(x, 200));
  }
  if (!mentions.length) { console.log(`  ∅ ${c.name} — aucune mention trouvée`); continue; }

  // 2) Rédaction : depuis les mentions, RIEN d'autre.
  const prompt = `Tu rédiges pour l'encyclopédie AKASHA la description française de « ${c.name} »
(univers ${c.universe}), une entité SANS page wiki propre. Tu ne disposes QUE des mentions
ci-dessous, extraites d'autres pages du wiki canon. Règles :
- 2 à 4 phrases, français encyclopédique sobre, présent de narration.
- UNIQUEMENT des faits présents dans les mentions. Ta mémoire de l'œuvre ne compte pas.
- Si les mentions ne permettent pas 2 phrases factuelles, réponds {"impossible": "raison"}.
Réponds UNIQUEMENT en JSON : {"descFr": "…"} ou {"impossible": "…"}

MENTIONS :
${mentions.join('\n\n').slice(0, 12000)}`;
  let sortie = {};
  try {
    const { stdout } = await execFile('claude', ['-p', prompt, '--model', 'claude-haiku-4-5'],
      { timeout: 240_000, maxBuffer: 4 * 1024 * 1024, env: (({ ANTHROPIC_API_KEY: _cle, ...e }) => e)(process.env) });
    sortie = JSON.parse((stdout.match(/\{[\s\S]*\}/) ?? ['{}'])[0]);
  } catch (e) { console.error(`  ✗ ${c.name} : ${String(e.message).slice(0, 90)}`); continue; }

  if (sortie.impossible || !sortie.descFr || sortie.descFr.length < 80) {
    console.log(`  ◇ ${c.name} — mentions insuffisantes (${String(sortie.impossible ?? 'trop court').slice(0, 60)})`);
    continue;
  }
  console.log(`  ✓ ${c.name} — ${sortie.descFr.length} car. depuis ${pages.length} page(s)`);
  if (DRY) continue;
  // 3) Signature et publication directe — le circuit validé par Dan pour ce rôle.
  const attrs = { ...(c.attributes ?? {}), descFr: sortie.descFr, descFrSource: `${SIGNE} · mentions : ${pages.join(', ').slice(0, 160)}` };
  await supabase.from('akasha_entries').update({ attributes: attrs }).eq('slug', c.slug);
  redigees++;
}
console.log(`\n${redigees} fiche(s) rédigée(s), signées et sourcées`);
await battreEnClaude('redacteur', `${redigees} fiche(s) rédigée(s) ce passage`);
