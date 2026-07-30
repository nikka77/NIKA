// scripts/ops-escalades.mjs — le CONSOMMATEUR D'ESCALADES (27/07, « go escalades » Dan).
// Dan demande une modification du code sur WhatsApp → le secrétaire marque l'escalade →
// ce script la confie à Claude (`claude -p`, abonnement) SUR UNE BRANCHE, jamais sur main,
// jamais de push — puis renvoie le résumé du diff sur WhatsApp. La fusion reste un geste humain.
//
// Garde-fous, dans l'ordre :
//   1. Seules les notes escalade=true du secrétaire (donc du numéro vérifié de Dan) sont lues.
//   2. Claude travaille dans le clone d'automatisation (~/dev/NIKA), sur une branche escalade/<id>.
//   3. Outils restreints : lecture/écriture de fichiers + typecheck — PAS de git, PAS de push.
//   4. Le commit est fait par CE script, pas par Claude ; le dépôt revient toujours sur main.
//   5. Verrou anti-concurrence + délai max 10 min par escalade, 3 escalades max par passage.
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync, statSync } from 'node:fs';
import { envoyerOuParquer } from './lib/whatsapp.mjs';
import { envoyerAlerte } from './lib/alerte.mjs';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// Mac : clone d'automatisation ~/dev/NIKA (TCC iCloud) ; VPS : ~/NIKA — NIKA_DEPOT tranche.
const DEPOT = process.env.NIKA_DEPOT ?? process.env.HOME + '/dev/NIKA';
const VERROU = '/tmp/nika-escalades.lock';

// Env des appels claude : SANS ANTHROPIC_API_KEY — le CLI la préfère au token d'abonnement
// et part sur le compte API à sec (« Credit balance is too low », premier échec du 27/07).
const ENV_CLAUDE = { ...process.env }; delete ENV_CLAUDE.ANTHROPIC_API_KEY;
const sh = (cmd, args, opts = {}) => new Promise((res, rej) =>
  execFile(cmd, args, { cwd: DEPOT, timeout: opts.timeout ?? 60_000, ...(cmd === 'claude' ? { env: ENV_CLAUDE } : {}), ...opts },
    (e, out, err) => e && !opts.tolere ? rej(new Error(`${cmd}: ${String(err || e).slice(0, 200)}`)) : res((out ?? '').trim())));

// Les escalades finissent parfois des heures après le dernier message de Dan (rattrapage de
// nuit) : hors fenêtre de 24 h, le texte est PARQUÉ et livré à son prochain message — avec
// une relance par les canaux de repli pour qu'il sache qu'un message l'attend.
async function whatsapp(texte) {
  try {
    if ((await envoyerOuParquer(texte)) === 'parqué') {
      await envoyerAlerte("📬 NIKA OPS : un message de Claude t'attend — écris n'importe quoi sur WhatsApp pour le recevoir.");
    }
  } catch { /* jamais bloquant pour l'escalade */ }
}

// Verrou : un seul passage à la fois (périmé après 30 min — un crash ne bloque pas pour toujours).
if (existsSync(VERROU) && Date.now() - statSync(VERROU).mtimeMs < 30 * 60_000) {
  console.log('déjà en cours — verrou présent'); process.exit(0);
}
writeFileSync(VERROU, String(process.pid));

try {
  const { data: notes } = await supabase.from('ops_notes')
    .select('id, content').eq('source', 'whatsapp').eq('done', false)
    .order('id', { ascending: true }).limit(20);
  const escalades = (notes ?? [])
    .map((n) => { try { return { id: n.id, ...JSON.parse(n.content) }; } catch { return null; } })
    .filter((n) => n?.escalade).slice(0, 3);

  if (!escalades.length) { console.log('aucune escalade en attente'); process.exit(0); }

  // Session Claude : sans elle, on prévient au lieu de laisser pourrir en silence.
  try { await sh('claude', ['-p', 'OK', '--output-format', 'text'], { timeout: 120_000 }); }
  catch {
    await whatsapp('🏭 Usine — ⚠ escalade en attente mais token Claude invalide — régénère avec `claude setup-token` → .env.local (les 2 copies), puis renvoie ton message.');
    process.exit(0);
  }

  for (const esc of escalades) {
    const branche = `escalade/${esc.id}`;
    console.log(`▶ escalade #${esc.id} : ${esc.de_dan.slice(0, 70)}`);
    await sh('git', ['checkout', 'main']);
    await sh('git', ['pull', '--ff-only'], { tolere: true });
    // Anti-balayage : le `git add -A` final ramasserait tout fichier non commité sur main
    // (vécu le 27/07 : deux scripts modifiés à la main ont fini dans le commit d'escalade).
    const sale = await sh('git', ['status', '--porcelain']);
    if (sale) {
      await whatsapp(`🏭 Usine — ⚠ escalade #${esc.id} reportée : ~/dev/NIKA a des fichiers non commités (${sale.split('\n').length}). Commit/push côté iCloud puis git pull ici.`);
      console.log(`✗ clone sale — escalade #${esc.id} reportée`); break;
    }
    await sh('git', ['branch', '-D', branche], { tolere: true });
    await sh('git', ['checkout', '-b', branche]);

    let resume = '';
    try {
      resume = await sh('claude', [
        '-p',
        `Tu travailles dans le dépôt NIKA (branche ${branche}, déjà créée pour toi).
Réalise cette demande de Dan, reçue par WhatsApp :

« ${esc.de_dan} »

RÈGLES STRICTES :
- Lis d'abord tasks/lessons.md et respecte les conventions du dépôt (CLAUDE.md).
- Modifie uniquement les fichiers nécessaires. N'utilise JAMAIS git (ni commit, ni push, ni checkout).
- Vérifie ton travail (npx tsc --noEmit si tu touches du TypeScript).
- Termine ta réponse par UNE phrase : ce que tu as fait, pour Dan.`,
        '--output-format', 'text',
        '--allowedTools', 'Edit,Write,Read,Glob,Grep,Bash(npx tsc --noEmit:*)',
      ], { timeout: 600_000 });
    } catch (e) {
      await sh('git', ['checkout', 'main']);
      await whatsapp(`🏭 Usine — ❌ escalade #${esc.id} échouée : ${String(e).slice(0, 160)}. La demande reste notée.`);
      continue;
    }

    const modif = await sh('git', ['status', '--porcelain']);
    if (modif) {
      await sh('git', ['add', '-A']);
      await sh('git', ['commit', '-q', '-m', `escalade #${esc.id}: ${esc.de_dan.slice(0, 60)}\n\nDemandé par Dan via WhatsApp — branche à valider avant fusion.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>`]);
      const stat = await sh('git', ['diff', 'main', '--stat']);
      const derniere = resume.split('\n').filter(Boolean).pop() ?? '';
      await whatsapp(`🤖 Claude — escalade #${esc.id} terminée, branche ${branche} prête (~/dev/NIKA) :\n${derniere.slice(0, 250)}\n\n${stat.split('\n').pop()}\nRien n'est fusionné : réponds « fusionne l'escalade #${esc.id} » (ou dis-le en session) pour valider.`);
    } else {
      await whatsapp(`🤖 Claude — escalade #${esc.id} : j'ai répondu sans modifier de fichier — « ${resume.split('\n').filter(Boolean).pop()?.slice(0, 200) ?? ''} »`);
    }
    await sh('git', ['checkout', 'main']);          // la nuit fait `git pull` : toujours revenir sur main
    await supabase.from('ops_notes').update({ done: true }).eq('id', esc.id);
    console.log(`✓ escalade #${esc.id} traitée`);
  }
} finally {
  try { unlinkSync(VERROU); } catch { /* déjà retiré */ }
}
