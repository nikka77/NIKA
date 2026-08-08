// scripts/ops-reparer-curation-0808.mjs — les trois défauts PROUVÉS de la vague du 08/08.
//
// POURQUOI
// Les contre-vérificateurs ont réfuté trois des quatre chantiers. Ce script ne règle que ce qui est
// démontré sur pièces ; le reste part au plan comme chantier à instruire, parce qu'une correction
// non prouvée coûte plus cher que le défaut qu'elle prétend réparer.
//
//  1. `fu-yamanaka` porte MOT POUR MOT la fiche d'`ino-yamanaka` — même taille, même père, même
//     équipe. Fū Yamanaka est un autre personnage (membre de Root, corps possédé par Shin) : ce
//     n'est pas une source partagée, c'est une contamination. Le texte usurpé est retiré ; on n'en
//     invente pas un autre — la fiche repartira dans l'usine, qui la rédigera depuis sa vraie page.
//  2. `edo-tensei` — deux sections ont bien reçu le contenu de la fiche anglaise fusionnée, mais
//     leur champ `source` a gardé l'ancienne provenance. Une métadonnée de provenance fausse est
//     pire qu'absente : elle fait croire à une traçabilité qui n'existe pas.
//  3. `son-goku` — la biographie se termine sur une parenthèse sans point final. Cosmétique, mais
//     c'est la deuxième fiche du site.
//
// Usage : node --env-file=.env.local scripts/ops-reparer-curation-0808.mjs [--dry]
import { writeFile } from 'node:fs/promises';
import { clientSite } from '../lib/ops/db.mjs';

const DRY = process.argv.includes('--dry');
const s = clientSite();
const trace = { chantier: 'reparation-curation-0808', quand: new Date().toISOString(), dry: DRY, avant: {}, comptes: {} };
const dire = (...a) => console.log(...a);

// ── 1. contamination fu-yamanaka ────────────────────────────────────────────
{
  const { data: fu } = await s.from('akasha_entries').select('id, slug, attributes, summary').eq('slug', 'fu-yamanaka').maybeSingle();
  const { data: ino } = await s.from('akasha_entries').select('attributes').eq('slug', 'ino-yamanaka').maybeSingle();
  if (fu && ino) {
    const memeTexte = String(fu.attributes?.descRaw ?? '').slice(0, 300) === String(ino.attributes?.descRaw ?? '').slice(0, 300);
    trace.avant.fuYamanaka = { attributes: fu.attributes, summary: fu.summary, memeTexte };
    if (!memeTexte) dire('1. fu-yamanaka : le texte ne coïncide plus avec ino — RIEN TOUCHÉ (garde de concurrence)');
    else {
      const { descFr, descRaw, descLang, ...reste } = fu.attributes ?? {};
      if (!DRY) {
        await s.from('akasha_entries').update({
          attributes: { ...reste, descFrPurgee: 'texte d\'ino-yamanaka retiré le 08/08 (contamination) — à re-rédiger depuis la page de Fū Yamanaka' },
        }).eq('id', fu.id);
      }
      trace.comptes.fuYamanaka = 1;
      dire('1. fu-yamanaka : biographie usurpée d\'ino-yamanaka retirée (aucune remplaçante inventée)');
    }
  }
}

// ── 2. provenance des sections d'edo-tensei ─────────────────────────────────
{
  const { data: e } = await s.from('akasha_entries').select('id').eq('slug', 'edo-tensei').maybeSingle();
  if (e) {
    const { data: sec } = await s.from('akasha_sections').select('id, idx, titre, source').eq('entry_id', e.id).in('idx', ['2', '7']);
    trace.avant.edoTensei = sec ?? [];
    const SOURCE = 'fusion FR/EN du 08/08 — contenu repris de la fiche « Summoning: Impure World Reincarnation » (traduit, contre-vérifié)';
    for (const x of sec ?? []) {
      if (!DRY) await s.from('akasha_sections').update({ source: SOURCE }).eq('id', x.id);
    }
    trace.comptes.edoTensei = sec?.length ?? 0;
    dire(`2. edo-tensei : provenance corrigée sur ${sec?.length ?? 0} section(s)`);
  }
}

// ── 3. ponctuation finale de son-goku ───────────────────────────────────────
{
  const { data: g } = await s.from('akasha_entries').select('id, attributes').eq('slug', 'son-goku').maybeSingle();
  const t = String(g?.attributes?.descFr ?? '');
  trace.avant.sonGoku = { fin: t.slice(-60) };
  if (t && !/[.!?…»"”]\s*$/.test(t)) {
    if (!DRY) await s.from('akasha_entries').update({ attributes: { ...g.attributes, descFr: t.replace(/\s*$/, '') + '.' } }).eq('id', g.id);
    trace.comptes.sonGoku = 1;
    dire('3. son-goku : point final ajouté');
  } else dire('3. son-goku : ponctuation déjà correcte — rien touché');
}

await writeFile(new URL('../data/audits/reparation-curation-0808-trace.json', import.meta.url), JSON.stringify(trace, null, 1));
dire(`\n${DRY ? '(à blanc) ' : ''}trace : data/audits/reparation-curation-0808-trace.json`);
