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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DEPOT = process.env.HOME + '/dev/NIKA';
const VERROU = '/tmp/nika-escalades.lock';

const sh = (cmd, args, opts = {}) => new Promise((res, rej) =>
  execFile(cmd, args, { cwd: DEPOT, timeout: opts.timeout ?? 60_000, ...opts },
    (e, out, err) => e && !opts.tolere ? rej(new Error(`${cmd}: ${String(err || e).slice(0, 200)}`)) : res((out ?? '').trim())));

async function whatsapp(texte) {
  await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: process.env.WHATSAPP_TO, type: 'text', text: { body: texte } }),
  }).catch(() => {});
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
    await whatsapp('⚠ Escalade en attente mais session Claude expirée — lance `claude` dans Terminal.app puis renvoie ton message.');
    process.exit(0);
  }

  for (const esc of escalades) {
    const branche = `escalade/${esc.id}`;
    console.log(`▶ escalade #${esc.id} : ${esc.de_dan.slice(0, 70)}`);
    await sh('git', ['checkout', 'main']);
    await sh('git', ['pull', '--ff-only'], { tolere: true });
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
      await whatsapp(`❌ Escalade #${esc.id} échouée : ${String(e).slice(0, 160)}. La demande reste notée.`);
      continue;
    }

    const modif = await sh('git', ['status', '--porcelain']);
    if (modif) {
      await sh('git', ['add', '-A']);
      await sh('git', ['commit', '-q', '-m', `escalade #${esc.id}: ${esc.de_dan.slice(0, 60)}\n\nDemandé par Dan via WhatsApp — branche à valider avant fusion.\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>`]);
      const stat = await sh('git', ['diff', 'main', '--stat']);
      const derniere = resume.split('\n').filter(Boolean).pop() ?? '';
      await whatsapp(`🔧 Escalade #${esc.id} prête sur la branche ${branche} (~/dev/NIKA) :\n${derniere.slice(0, 250)}\n\n${stat.split('\n').pop()}\nRien n'est fusionné : dis à Claude « fusionne l'escalade #${esc.id} » (console /ops ou session) pour valider.`);
    } else {
      await whatsapp(`🔧 Escalade #${esc.id} : Claude a répondu sans modifier de fichier — « ${resume.split('\n').filter(Boolean).pop()?.slice(0, 200) ?? ''} »`);
    }
    await sh('git', ['checkout', 'main']);          // la nuit fait `git pull` : toujours revenir sur main
    await supabase.from('ops_notes').update({ done: true }).eq('id', esc.id);
    console.log(`✓ escalade #${esc.id} traitée`);
  }
} finally {
  try { unlinkSync(VERROU); } catch { /* déjà retiré */ }
}
