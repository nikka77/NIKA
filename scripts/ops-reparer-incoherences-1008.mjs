// scripts/ops-reparer-incoherences-1008.mjs — CHANTIER 4 : on ne corrige que ce qui est PROUVÉ.
//
// Quatre gestes, chacun adossé à une phrase-preuve tirée de la fiche elle-même ou du graphe :
//
//  C1 · RÉSUMÉ D'UN AUTRE GENRE — 10 fiches dont `category` vaut « Lieu » et dont le résumé dit
//       « Équipage de pirates. » (gabarit de repli de build-akasha-universes.mjs l.649). La fiche
//       se contredit dans sa propre ligne. Le résumé est réécrit depuis SA PREMIÈRE PHRASE, jamais
//       plus bas (leçon du 10/08 : un rang > 0 pend à un antécédent absent), et seulement si cette
//       phrase parle bien d'elle — un mot distinctif du nom doit s'y trouver. Sinon : résumé VIDÉ,
//       parce qu'on retire ce qui est faux plutôt que d'inventer ce qui serait juste.
//
//  C2 · « ET N AUTRES » QUE LA PAGE NE PORTE PAS — le résumé promet `noms + N` entités, la fiche en
//       relie `livré`. N est recalculé depuis le GRAPHE, à la milliseconde de l'écriture (le corpus
//       bouge : 16 769 arêtes à 13 h 32, 16 788 à 13 h 35 — un autre chantier écrit en parallèle).
//
//  C3 · TEXTE CONTAMINÉ — descFr qui raconte une AUTRE entité. Même geste que pour fu-yamanaka le
//       08/08 : le texte usurpé part, on n'en invente pas un autre, et le motif reste écrit dans
//       `descFrPurgee` (clé déjà masquée par EntityAttributes). Liste LUE une par une, jamais
//       seuillée : le détecteur automatique rendait 11 faux sur 19 (homonymes désambiguïsés).
//
//  C4 · ATTRIBUT D'UN AUTRE TYPE — `scope: « Équipage pirate »` sur le Pays de Kano (type place),
//       vestige de la fusion du 09/08 avec son doublon typé équipage. Il s'affiche : le bloc
//       « Attributs » de /learn/akasha/kano-country rend la ligne « scope · Équipage pirate ».
//       Et `village` contredit par la prose de la fiche (1 cas prouvé deux fois indépendamment).
//
// GARDES : chaque geste revérifie sa condition sur la ligne FRAÎCHE avant d'écrire (concurrence) ;
// `attributes` est relu puis réécrit en ne changeant QUE les clés du chantier ; la trace part avant
// l'écriture, sur un chemin horodaté différent à chaque exécution.
//
// Usage : node --env-file=.env.local scripts/ops-reparer-incoherences-1008.mjs [--ecrire]
import fs from 'node:fs';
import { clientSite } from '../lib/ops/db.mjs';

const ECRIRE = process.argv.includes('--ecrire');
const db = clientSite();
const h = new Date().toISOString().replace(/[:.]/g, '-');
const chemin = `data/audits/incoherences-${ECRIRE ? 'application' : 'blanc'}-${h}.json`;

const page = async (table, sel) => {
  const out = [];
  for (let d = 0; ; d += 1000) {
    const { data, error } = await db.from(table).select(sel).order('id').range(d, d + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return out;
};

const entries = await page('akasha_entries', 'id, slug, name, type, universe, summary, attributes');
const rels = await page('akasha_relations', 'id, from_entry, to_entry, relation');
const bySlug = new Map(entries.map((e) => [e.slug, e]));
console.log(`socle : ${entries.length} fiches · ${rels.length} arêtes`);

const trace = { chantier: 'chantier 4 — incohérences déclaré/dit', quand: new Date().toISOString(), ecrire: ECRIRE, socle: { fiches: entries.length, aretes: rels.length }, C1: [], C2: [], C3: [], C4: [], refus: [] };
const nu = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const majAttrs = async (e, muter, note) => {
  const { data: frais, error } = await db.from('akasha_entries').select('attributes').eq('id', e.id).maybeSingle();
  if (error || !frais) return { ok: false, pourquoi: 'relecture impossible' };
  const a = { ...(frais.attributes ?? {}) };
  const verdict = muter(a);
  if (verdict !== true) return { ok: false, pourquoi: verdict };
  if (ECRIRE) {
    const { error: err } = await db.from('akasha_entries').update({ attributes: a }).eq('id', e.id);
    if (err) return { ok: false, pourquoi: err.message };
  }
  return { ok: true, note };
};

// ═══ C1 · résumé « Équipage de pirates. » sur une fiche dont la curation dit « Lieu » ═══════════
// `\b` est ASCII en JavaScript : « \bîle » ne matche JAMAIS « une île », parce que « î » n'est pas
// un caractère de mot et qu'il n'y a donc aucune frontière devant lui. Quatre fiches sur dix
// tombaient dans ce trou au premier essai. Bornes en lookaround unicode.
const GENRE = /(?<!\p{L})(archipel|[îi]les?|royaume|ville|cit[ée]|village|pays|port|montagnes?|for[êe]t|r[ée]gion|territoire|continent|mer|corps c[ée]leste|nation|plan[èe]te|contr[ée]e|navire)(?!\p{L})/iu;
// Mots qui ne distinguent RIEN : ils reviennent dans la moitié des noms de lieux. « Lune » et
// « Mont », eux, restent distinctifs — les mettre ici viderait le résumé de « La lune ».
const MOTS_VIDES = new Set(['ile', 'iile', 'les', 'des', 'del', 'the', 'archipel', 'royaume', 'pays', 'ville', 'cite', 'village', 'port']);
const clamp = (s, max) => {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trimEnd()}…`;
};
for (const e of entries) {
  if ((e.summary ?? '').trim() !== 'Équipage de pirates.') continue;
  if ((e.attributes?.category ?? null) !== 'Lieu') continue;
  const t = typeof e.attributes?.descFr === 'string' ? e.attributes.descFr.trim() : '';
  const p1 = t ? t.replace(/\s+/g, ' ').split(/(?<=[.!?])\s/)[0] : '';
  // La phrase doit parler de CETTE fiche : un mot distinctif du nom doit y figurer.
  const distinctifs = nu(e.name).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 4 && !MOTS_VIDES.has(w));
  const parleDElle = distinctifs.some((w) => nu(p1).includes(w));
  const definitionnelle = p1.length >= 45 && p1.length <= 300 && GENRE.test(p1) && /^[A-ZÀ-ÝL]/.test(p1);
  const neuf = parleDElle && definitionnelle ? clamp(p1, 200) : null;
  const ligne = { slug: e.slug, type: e.type, avant: e.summary, apres: neuf, geste: neuf ? 'réécrit depuis sa première phrase' : 'vidé (rien d’extractible)', phrasePreuve: p1 || '(descFr vide)' };
  if (ECRIRE) {
    const { data: frais } = await db.from('akasha_entries').select('summary').eq('id', e.id).maybeSingle();
    if ((frais?.summary ?? '').trim() !== 'Équipage de pirates.') { trace.refus.push({ ...ligne, refus: 'résumé déjà changé par un autre chantier' }); continue; }
    const { error } = await db.from('akasha_entries').update({ summary: neuf }).eq('id', e.id);
    if (error) { trace.refus.push({ ...ligne, refus: error.message }); continue; }
  }
  trace.C1.push(ligne);
}

// ═══ C2 · « et N autres » recalculé depuis le graphe ════════════════════════════════════════════
const VERBE = { 'porté par': 'possede', 'portée par': 'maitrise', 'réunit': 'appartient', 'maîtrisée par': 'maitrise', 'maîtrisé par': 'maitrise' };
// Un compteur qui additionne des ARÊTES ment dès que la page, elle, en filtre une partie :
// OrganizationZone ne garde de `appartient` entrant que les cibles de type `character`
// (components/akasha/zone/OrganizationZone.tsx l.40-41). Mesuré : akatsuki reçoit 44 arêtes
// `appartient` mais n'affiche que 37 figures — les 7 autres sont des artefacts, rangés dans la
// grappe « Arsenal ». Le résumé promet des MEMBRES : c'est la population filtrée qu'il doit citer.
const parId = new Map(entries.map((e) => [e.id, e]));
const entrantes = new Map();
for (const r of rels) {
  if (!entrantes.has(r.to_entry)) entrantes.set(r.to_entry, {});
  const c = entrantes.get(r.to_entry);
  const cle = r.relation === 'appartient' && parId.get(r.from_entry)?.type !== 'character'
    ? 'appartient_hors_personnage' : r.relation;
  c[cle] = (c[cle] ?? 0) + 1;
}
for (const e of entries) {
  const s = e.summary ?? '';
  const m = /\s*et\s+(\d+)\s+autres?\b/.exec(s);
  if (!m) continue;
  const mv = new RegExp(`(${Object.keys(VERBE).join('|')})\\s+(.*)$`).exec(s.slice(0, m.index));
  if (!mv) continue;
  const noms = mv[2].split(',').map((x) => x.trim()).filter(Boolean);
  const livre = entrantes.get(e.id)?.[VERBE[mv[1]]] ?? 0;
  const promis = noms.length + Number(m[1]);
  if (promis === livre) continue;
  const reste = livre - noms.length;
  const clause = reste > 0 ? ` et ${reste} autre${reste > 1 ? 's' : ''}` : '';
  const neuf = s.slice(0, m.index) + clause + s.slice(m.index + m[0].length);
  const ligne = { slug: e.slug, type: e.type, relation: VERBE[mv[1]], promis, livre, avant: s, apres: neuf, preuve: `${livre} arête(s) « ${VERBE[mv[1]]} » entrantes comptées sur le graphe paginé` };
  if (ECRIRE) {
    const { data: frais } = await db.from('akasha_entries').select('summary').eq('id', e.id).maybeSingle();
    if ((frais?.summary ?? '') !== s) { trace.refus.push({ ...ligne, refus: 'résumé changé entre la mesure et l’écriture' }); continue; }
    const { error } = await db.from('akasha_entries').update({ summary: neuf }).eq('id', e.id);
    if (error) { trace.refus.push({ ...ligne, refus: error.message }); continue; }
  }
  trace.C2.push(ligne);
}

// ═══ C3 · textes contaminés, LUS un par un ═════════════════════════════════════════════════════
// `resume: true` = le résumé porte le MÊME texte étranger et part avec lui.
// `attendu` = les premiers mots du texte USURPÉ. Sans cette clé, un rejeu du script détruirait un
// texte JUSTE : deux heures après la première application, un chantier parallèle avait déjà
// re-rédigé three-giant-snakes (« Les trois serpents géants sont des invocations… ») et manda-ii
// (« Manda II est un serpent cloné créé par Kabuto Yakushi… »). Une liste de réparation est datée ;
// elle doit dire de quel état elle parle.
const CONTAMINES = [
  { slug: 'shun', attendu: 'Haruna était la fille du daimyō', resume: true, motif: 'texte de haruna-naruto (« Haruna était la fille du daimyō du Pays des Légumes. ») retiré le 10/08 — Shun est un autre personnage' },
  { slug: 'girl', attendu: "Ribrianne est une guerrière de l'Univers 2", resume: false, motif: 'biographie de ribrianne (« Ribrianne est une guerrière de l’Univers 2… ») retirée le 10/08' },
  { slug: 'madillo-man', attendu: 'Babanuki est un Headliner', resume: false, motif: 'texte de babanuki (« Babanuki est un Headliner de l’équipage des Cent Bêtes… ») retiré le 10/08' },
  { slug: 'king-naruto', attendu: 'Son Gokû, plus communément appelé le Quatre Queues', resume: true, motif: 'texte du Quatre Queues Son Gokû (« …Démon à queues scellé en Rôshi d’Iwagakure ») retiré le 10/08 — la fiche est « King »' },
  { slug: 'three-giant-snakes', attendu: 'Isobu, plus communément appelé le Trois Queues', resume: true, motif: 'texte d’Isobu le Trois Queues retiré le 10/08 — la fiche est « Three Giant Snakes », une invocation d’Orochimaru' },
  { slug: 'manda-ii', attendu: "Manda est l'invocation personnelle d'Orochimaru", resume: true, motif: 'texte de manda retiré le 10/08 (il nomme Manda II comme le CLONE de son sujet : « surpassé en taille par son clone, Manda II »)' },
  { slug: 'atk-bl-flash-cry', attendu: 'Shunkō est une technique hybride', resume: false, motif: 'texte du Shunkō retiré le 10/08 — atk-bl-shunko porte déjà cette technique' },
  { slug: 'ashisogi-jizo', attendu: 'Mayuri Kurotsuchi est le capitaine de la 12e Division', resume: false, motif: 'biographie de mayuri-kurotsuchi retirée le 10/08 — la fiche est son Zanpakutō, ce que dit d’ailleurs son propre résumé' },
  { slug: 'majin-buu-gohan', attendu: "Super Buu est la forme résultant de l'absorption", resume: false, motif: 'texte de super-buu (absorption de Good Buu par Evil Buu) retiré le 10/08 — la fiche est la forme d’APRÈS l’absorption de Gohan' },
  { slug: 'cultist', attendu: "Tsuzumi est un adepte d'un culte", resume: false, motif: 'biographie de l’individu Tsuzumi retirée le 10/08 — la fiche est un MÉTIER, et son résumé le définit correctement' },
  { slug: 'carpenter', attendu: 'Kanna est le charpentier en chef', resume: false, motif: 'biographie de l’individu Kanna retirée le 10/08 — la fiche est un MÉTIER, et son résumé le définit correctement' },
  { slug: 'bodyguard', attendu: 'Le garde du corps de Tenzen Daikoku', resume: false, motif: 'biographie d’un individu (« Le garde du corps de Tenzen Daikoku… ») retirée le 10/08 — la fiche est un MÉTIER' },
  { slug: 'ile-celeste', attendu: 'Skypiea est une nation céleste', resume: false, motif: 'description du LIEU Skypiea retirée le 10/08 — skypiea-lieu la porte déjà ; cette fiche est la saga' },
  { slug: 'captain-of-the-lady-mary', attendu: 'Première apparition : Épisode 1', resume: false, motif: 'description du NAVIRE Lady Mary retirée le 10/08 — la fiche est son capitaine' },
  { slug: 'sakon', attendu: "Sakon est un ninja d'Otogakure", resume: true, motif: 'biographie du ninja Sakon retirée le 10/08 — la fiche est typée pouvoir (catégorie Jutsu) et reçoit une arête « maitrise »' },
  { slug: 'kiba-naruto', attendu: 'Kiba est un membre du clan Inuzuka', resume: false, motif: 'biographie de Kiba Inuzuka retirée le 10/08 — la fiche est l’ARME Kiba (sabre foudroyant des Sept Épéistes)' },
  { slug: 'sabre', attendu: "Technique utilisant l'énergie de la Pierre de Gelel", resume: false, motif: 'texte d’une technique de la Pierre de Gelel retiré le 10/08 — la fiche est l’arme générique « Sabre »' },
  { slug: 'lance', attendu: 'Ninjutsu de coopération exécuté conjointement', resume: false, motif: 'texte d’un ninjutsu de coopération Terre/Foudre retiré le 10/08 — la fiche est l’arme générique « Lance »' },
];
for (const c of CONTAMINES) {
  const e = bySlug.get(c.slug);
  if (!e) { trace.refus.push({ slug: c.slug, refus: 'fiche absente' }); continue; }
  const avant = typeof e.attributes?.descFr === 'string' ? e.attributes.descFr : null;
  if (!avant) { trace.refus.push({ slug: c.slug, refus: 'descFr déjà absent — rien touché' }); continue; }
  // Le texte en place doit être CELUI qu'on a lu et jugé usurpé. Sinon quelqu'un l'a réparé depuis :
  // on passe la main, on ne détruit pas son travail.
  if (!avant.startsWith(c.attendu)) {
    trace.refus.push({ slug: c.slug, refus: 'texte différent de celui constaté — un autre chantier l’a réécrit, rien touché', enPlace: avant.slice(0, 160), attendu: c.attendu });
    continue;
  }
  const res = await majAttrs(e, (a) => {
    if (String(a.descFr ?? '').slice(0, 120) !== avant.slice(0, 120)) return 'descFr changé entre la mesure et l’écriture';
    delete a.descFr; delete a.descRaw; delete a.descLang; delete a.descFrSource;
    a.descFrPurgee = c.motif;
    return true;
  }, c.motif);
  if (!res.ok) { trace.refus.push({ slug: c.slug, refus: res.pourquoi }); continue; }
  const ligne = { slug: c.slug, type: e.type, motif: c.motif, descFrRetire: avant.slice(0, 220), resumeRetire: null };
  if (c.resume && e.summary) {
    if (ECRIRE) await db.from('akasha_entries').update({ summary: null }).eq('id', e.id);
    ligne.resumeRetire = e.summary.slice(0, 220);
  }
  trace.C3.push(ligne);
}

// ═══ C4 · attributs d'un autre type / contredits par la prose ═══════════════════════════════════
{
  const e = bySlug.get('kano-country');
  if (e && e.attributes?.scope === 'Équipage pirate') {
    const res = await majAttrs(e, (a) => {
      if (a.scope !== 'Équipage pirate') return 'scope déjà changé';
      delete a.scope;
      return true;
    });
    trace[res.ok ? 'C4' : 'refus'].push({
      slug: 'kano-country', cle: 'scope', avant: 'Équipage pirate', apres: '(retiré)', refus: res.pourquoi,
      preuve: 'type place · category « Lieu » · descFr « Le Pays de Kano, situé dans le West Blue, évoque une cité chinoise antique… » — et la fusion du 09/08 (scripts/ops-fusionner-doublons.mjs) a gardé cette fiche CONTRE un doublon typé équipage. Rendu vérifié : le bloc « Attributs » de /learn/akasha/kano-country affichait « scope · Équipage pirate ».',
    });
  } else trace.refus.push({ slug: 'kano-country', refus: 'scope absent ou déjà corrigé' });
}
{
  const e = bySlug.get('suiren');
  if (e && e.attributes?.village === 'Amegakure') {
    const res = await majAttrs(e, (a) => {
      if (a.village !== 'Amegakure') return 'village déjà changé';
      a.village = 'Kirigakure';
      return true;
    });
    trace[res.ok ? 'C4' : 'refus'].push({
      slug: 'suiren', cle: 'village', avant: 'Amegakure', apres: 'Kirigakure', refus: res.pourquoi,
      preuve: 'sa propre prose : « Suiren (スイレン, Suiren) était une kunoichi de Kirigakure. » — et la fiche suiren-kiri, rédigée par une autre source, dit la même chose : « Suiren était une kunoichi de Kirigakure et membre de l’équipe de Ganryū. »',
    });
  } else trace.refus.push({ slug: 'suiren', refus: 'village absent ou déjà corrigé' });
}

fs.writeFileSync(chemin, JSON.stringify(trace, null, 1));
console.log(`${ECRIRE ? 'ÉCRIT' : 'à blanc'} — C1 ${trace.C1.length} · C2 ${trace.C2.length} · C3 ${trace.C3.length} · C4 ${trace.C4.length} · refus ${trace.refus.length}`);
console.log(`trace → ${chemin}`);
