// scripts/akasha-controle-lisibilite-ecran.mjs — LE MÊME CALCUL, MAIS DANS UN VRAI NAVIGATEUR.
//
// POURQUOI. La mesure de `akasha-mesure-lisibilite-visuels.mjs` compose les pixels avec sharp,
// hors navigateur. Un instrument qui n'a jamais été confronté à l'écran est un instrument
// qu'on croit sur parole — et une vague dont le vérificateur crie fort doit d'abord suspecter
// SON instrument. Ce script rejoue la composition dans Chromium : le décodeur du navigateur,
// le même fond #09152A, le même `objectFit: contain`, `getImageData` en sortie.
//
// Il ne conclut RIEN sur le corpus : il dit si les deux instruments tombent d'accord, et de combien.
//
// Usage : node --env-file=.env.local scripts/akasha-controle-lisibilite-ecran.mjs \
//           --trace=data/audits/lisibilite-visuels-avant-….json [--n=20] [--famille=illisible|tous]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d;
const TRACE = arg('trace', '');
const N = Number(arg('n', 20));
const FAMILLE = arg('famille', 'tous');
const AUDITS = new URL('../data/audits/', import.meta.url).pathname;
const HORO = new Date().toISOString().replace(/[:.]/g, '-');

const j = JSON.parse(await readFile(TRACE, 'utf8'));
let pool = j.tous.filter((r) => !r.erreur);
if (FAMILLE !== 'tous') pool = pool.filter((r) => r.verdict === FAMILLE);
// Échantillon DÉTERMINISTE et étalé sur toute la population, pas les N premiers (qui sont triés
// par slug et donc par univers) : un pas régulier dans la liste triée par contraste maximal.
pool.sort((a, b) => a.contraste_max - b.contraste_max);
const pas = Math.max(1, Math.floor(pool.length / N));
const ech = pool.filter((_, i) => i % pas === 0).slice(0, N);

const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 400, height: 400 } });
await page.setContent('<body style="margin:0;background:#09152A"></body>');

const mesure = await page.evaluate(async (urls) => {
  const FOND = [9, 21, 42];
  const lin = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : (((c / 255) + 0.055) / 1.055) ** 2.4);
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const LF = lum(...FOND);
  const ct = (L) => (Math.max(L, LF) + 0.05) / (Math.min(L, LF) + 0.05);
  const out = [];
  for (const u of urls) {
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => res(i);
        i.onerror = () => rej(new Error('chargement refusé'));
        i.src = u;
      });
      // `contain` dans un cadre carré de 256, fond peint AVANT — exactement ce que fait le site.
      const S = 256;
      const cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      cx.fillStyle = 'rgb(9,21,42)';
      cx.fillRect(0, 0, S, S);
      const k = Math.min(S / img.naturalWidth, S / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      cx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      // On ne mesure QUE le rectangle occupé par l'image : le reste du cadre est du fond pur,
      // il diluerait la couverture d'autant plus que l'image est étroite.
      const x0 = Math.round((S - w) / 2), y0 = Math.round((S - h) / 2);
      const d = cx.getImageData(x0, y0, Math.max(1, Math.round(w)), Math.max(1, Math.round(h))).data;
      let max = 0, c15 = 0, c20 = 0, n = d.length / 4;
      for (let i = 0; i < n; i++) {
        const c = ct(lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]));
        if (c > max) max = c;
        if (c >= 1.5) c15++;
        if (c >= 2) c20++;
      }
      out.push({ url: u, nav_contraste_max: +max.toFixed(3), nav_couverture_1_5: +(c15 / n).toFixed(4), nav_couverture_2: +(c20 / n).toFixed(4), nav_definition: `${img.naturalWidth}×${img.naturalHeight}` });
    } catch (e) { out.push({ url: u, erreur: String(e.message ?? e) }); }
  }
  return out;
}, ech.map((r) => r.url.startsWith('/') ? `http://localhost:3000${r.url}` : r.url));

await nav.close();

// Le verdict RECALCULÉ depuis les chiffres du navigateur — c'est lui la décision, pas la décimale.
const verdictNav = (n) => (n.nav_contraste_max < 2 || n.nav_couverture_1_5 < 0.005) ? 'illisible'
  : n.nav_couverture_2 < 0.03 ? 'presque illisible' : 'lisible';

const lignes = ech.map((r, i) => {
  const n = mesure[i];
  // Tolérance RELATIVE : à contraste 15, 0,4 d'écart est du rééchantillonnage (sharp `nearest`
  // sur 256 px vs le bilinéaire du canvas), pas un désaccord d'instrument.
  const ok = !n.erreur
    && Math.abs(n.nav_contraste_max - r.contraste_max) <= 0.1 * Math.max(1, r.contraste_max)
    && Math.abs(n.nav_couverture_1_5 - r.couverture_1_5) <= 0.06;
  return { fiches: r.fiches, ...n, sharp_contraste_max: r.contraste_max, sharp_couverture_1_5: r.couverture_1_5, sharp_couverture_2: r.couverture_2, verdict_sharp: r.verdict, verdict_navigateur: n.erreur ? null : verdictNav(n), accord_chiffres: ok };
});
const testables = lignes.filter((l) => !l.erreur);
const desaccords = testables.filter((l) => !l.accord_chiffres);
const desaccordsVerdict = testables.filter((l) => l.verdict_sharp !== l.verdict_navigateur);
const trace = {
  chantier: "contrôle à l'écran de l'instrument de lisibilité",
  quand: new Date().toISOString(), trace_mesuree: TRACE, famille: FAMILLE,
  methode: "Chromium décode l'image, la peint en `contain` sur #09152A, `getImageData` recalcule contraste maximal et couverture ; tolérance 10 % relatif sur le contraste, 6 points sur la couverture, et comparaison du VERDICT recalculé",
  compte: {
    echantillon: ech.length, testables: testables.length,
    accords_chiffres: testables.length - desaccords.length, desaccords_chiffres: desaccords.length,
    taux_desaccord_chiffres: testables.length ? +(desaccords.length / testables.length).toFixed(3) : null,
    accords_verdict: testables.length - desaccordsVerdict.length, desaccords_verdict: desaccordsVerdict.length,
    taux_desaccord_verdict: testables.length ? +(desaccordsVerdict.length / testables.length).toFixed(3) : null,
  },
  lignes,
};
await mkdir(AUDITS, { recursive: true });
const nom = `${AUDITS}lisibilite-controle-ecran-${FAMILLE}-${HORO}.json`;
await writeFile(nom, JSON.stringify(trace, null, 2));
console.log(`chiffres ${trace.compte.accords_chiffres}/${trace.compte.testables} · verdicts ${trace.compte.accords_verdict}/${trace.compte.testables} · trace → ${nom}`);
for (const d of desaccords) console.log('  ~', d.fiches?.[0], `sharp ${d.sharp_contraste_max}/${d.sharp_couverture_1_5} · nav ${d.nav_contraste_max}/${d.nav_couverture_1_5} · verdicts ${d.verdict_sharp} / ${d.verdict_navigateur}`);
for (const d of desaccordsVerdict) console.log('  ✗ VERDICT', d.fiches?.[0], d.url?.slice(0, 90), `${d.verdict_sharp} → ${d.verdict_navigateur}`);
