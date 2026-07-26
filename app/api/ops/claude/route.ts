// app/api/ops/claude/route.ts — lance Claude Code en mode non-interactif depuis la console OPS
// et renvoie sa progression en flux. Verrouillé localhost (lib/ops/guard).
//
// ⚠ Claude s'exécute avec les droits d'écriture sur le dépôt : cette route ne doit JAMAIS
// être exposée en ligne. Le verrou d'hôte est la seule chose qui l'en empêche.
import { NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { opsAllowed } from '@/lib/ops/guard';

export const dynamic = 'force-dynamic';
export const maxDuration = 3600;

export async function POST(req: Request) {
  if (!(await opsAllowed())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt?.trim()) return NextResponse.json({ error: 'consigne vide' }, { status: 400 });

  const child = spawn(
    'claude',
    ['-p', prompt, '--output-format', 'stream-json', '--verbose'],
    { cwd: process.cwd(), env: process.env },
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const push = (o: unknown) => controller.enqueue(encoder.encode(JSON.stringify(o) + '\n'));
      let reste = '';

      child.stdout.on('data', (buf: Buffer) => {
        reste += buf.toString();
        const lignes = reste.split('\n');
        reste = lignes.pop() ?? '';
        for (const l of lignes) {
          if (!l.trim()) continue;
          try {
            const e = JSON.parse(l);
            // On ne renvoie que ce qui se lit : texte de Claude, outils utilisés, résultat final.
            if (e.type === 'assistant') {
              for (const bloc of e.message?.content ?? []) {
                if (bloc.type === 'text' && bloc.text) push({ k: 'texte', v: bloc.text });
                if (bloc.type === 'tool_use') push({ k: 'outil', v: bloc.name });
              }
            } else if (e.type === 'result') {
              push({ k: 'fin', v: e.result ?? '', erreur: Boolean(e.is_error), tours: e.num_turns });
            }
          } catch { /* ligne partielle */ }
        }
      });

      child.stderr.on('data', (b: Buffer) => push({ k: 'stderr', v: b.toString().slice(0, 400) }));
      child.on('error', (e) => { push({ k: 'fin', v: String(e), erreur: true }); controller.close(); });
      child.on('close', () => controller.close());
    },
    cancel() { child.kill(); },   // l'utilisateur ferme l'onglet → on n'abandonne pas un process orphelin
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
