'use client';
// components/dan/CartePhygitale.tsx — la carte qu'on ouvre en tapant la puce NFC d'un membre DAN.
//
// Gabarit unique pour le #0 et les chefs de pôle 1 à 9 : seules les données (lib/dan/cartes.ts)
// changent. Les 3 portes s'ouvrent en panneau par-dessus la carte ; l'ancre (#coeur, #moi,
// #jouer) est tenue à jour pour qu'un lien ou un second tap rouvre la bonne porte.
// Le livre d'or et les suggestions passent par /api/dan/[matricule]/mots (partagés entre
// visiteurs) et retombent sur le stockage local si la base n'est pas joignable.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { CarteDan, UniversGout } from '@/lib/dan/cartes';
import { IconeTrait, IconeUnivers, Voxel } from './icones';
import s from './CartePhygitale.module.css';

type Porte = 'coeur' | 'moi' | 'jouer';
type OngletJouer = 'arc' | 'chk' | 'liv' | 'fla';
type Mot = { nom: string; texte: string; date: string };

const PORTES: Porte[] = ['coeur', 'moi', 'jouer'];
const MS_JOUR = 86_400_000;

function age(naissanceIso: string, maintenant: number) {
  return Math.floor((maintenant - new Date(naissanceIso).getTime()) / 31_557_600_000);
}
function fraicheur(jours: number) {
  return jours < 30 ? '#3BF06A' : jours < 90 ? '#FFB92E' : '#FF5C5C';
}
function dateCourte(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function lireLocal<T>(cle: string, defaut: T): T {
  try { const v = JSON.parse(localStorage.getItem(cle) || 'null'); return v ?? defaut; } catch { return defaut; }
}
function ecrireLocal(cle: string, v: unknown) {
  try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* navigation privée */ }
}

export default function CartePhygitale({ carte }: { carte: CarteDan }) {
  const m = carte.matricule;
  const [porte, setPorte] = useState<Porte | null>(null);
  const [indice, setIndice] = useState(false);
  const [lueur, setLueur] = useState<string | null>(null);
  const [univers, setUnivers] = useState<UniversGout['cle']>(carte.coeur.univers[0]?.cle ?? 'ali');
  const [ongletJ, setOngletJ] = useState<OngletJouer>('arc');
  const [artiste, setArtiste] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState<number | null>(null);

  // ── Ouverture / fermeture des portes, synchronisées avec l'ancre ──
  const ouvrir = useCallback((p: Porte) => {
    setPorte(p); setIndice(false);
    ecrireLocal(`dan${m}.indice`, 1);
    try { history.replaceState(null, '', `#${p}`); } catch { /* */ }
  }, [m]);
  const fermer = useCallback(() => {
    setPorte(null);
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* */ }
  }, []);

  useEffect(() => {
    setMaintenant(Date.now());
    const lireAncre = () => {
      const h = location.hash.replace('#', '') as Porte;
      if (PORTES.includes(h)) setPorte(h);
    };
    lireAncre();
    if (!location.hash && !lireLocal(`dan${m}.indice`, 0)) setIndice(true);
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(); };
    window.addEventListener('hashchange', lireAncre);
    window.addEventListener('keydown', touche);
    return () => { window.removeEventListener('hashchange', lireAncre); window.removeEventListener('keydown', touche); };
  }, [m, fermer]);

  // ── Ticker : défilement continu, pause au survol, glisser au doigt / à la souris ──
  const tickRef = useRef<HTMLDivElement>(null);
  const pause = useRef(false);
  useEffect(() => {
    const el = tickRef.current; if (!el) return;
    let pos = 0, last: number | null = null, raf = 0;
    let drag: { x: number; s: number } | null = null;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) pause.current = true;
    const boucle = (v: number) => { const h = el.scrollWidth / 2; if (h > 0) { if (v < 0) v += h; else if (v >= h) v -= h; } return v; };
    const down = (e: PointerEvent) => { drag = { x: e.clientX, s: el.scrollLeft }; pause.current = true; el.style.cursor = 'grabbing'; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const v = boucle(drag.s - (e.clientX - drag.x));
      drag = { x: e.clientX, s: v }; pos = v; el.scrollLeft = v;
    };
    const up = () => {
      if (!drag) return;
      drag = null; el.style.cursor = 'grab';
      if (!el.matches(':hover')) pause.current = false;
    };
    const scroll = () => { if (pause.current) pos = el.scrollLeft; };
    const step = (ts: number) => {
      const dt = last === null ? 0 : Math.min(ts - last, 50); last = ts;
      if (!pause.current) { pos = boucle(pos + (dt / 1000) * 39); el.scrollLeft = pos; }
      raf = requestAnimationFrame(step);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', down); el.removeEventListener('scroll', scroll);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    };
  }, []);

  // ── Livre d'or + suggestions (partagés via l'API, repli local) ──
  const [livre, setLivre] = useState<Mot[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [horsLigne, setHorsLigne] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [nom, setNom] = useState('');
  const [mot, setMot] = useState('');
  const [idee, setIdee] = useState('');
  const charge = useRef(false);

  useEffect(() => {
    if (porte !== 'jouer' || charge.current) return;
    charge.current = true;
    fetch(`/api/dan/${m}/mots`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { livre: Mot[]; suggestions: string[] }) => { setLivre(d.livre); setSuggestions(d.suggestions); })
      .catch(() => {
        setHorsLigne(true);
        setLivre(lireLocal<Mot[]>(`dan${m}.livre`, []));
        setSuggestions(lireLocal<string[]>(`dan${m}.idees`, []));
      });
  }, [porte, m]);

  const poster = useCallback(async (genre: 'livre' | 'suggestion', texte: string, auteur?: string) => {
    setEnvoi(true);
    try {
      if (!horsLigne) {
        const r = await fetch(`/api/dan/${m}/mots`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genre, texte, nom: auteur }),
        });
        if (r.ok) return (await r.json()) as { mot: Mot };
        if (r.status !== 503) return null; // refus (texte vide, trop long…) : on n'enregistre rien
        setHorsLigne(true);
      }
      return { mot: { nom: (auteur || 'Anonyme').toUpperCase(), texte, date: new Date().toISOString() }, local: true };
    } catch {
      setHorsLigne(true);
      return { mot: { nom: (auteur || 'Anonyme').toUpperCase(), texte, date: new Date().toISOString() }, local: true };
    } finally { setEnvoi(false); }
  }, [m, horsLigne]);

  const signer = async () => {
    const t = mot.trim(); if (!t || envoi) return;
    const r = await poster('livre', t, nom.trim());
    if (!r) return;
    const suite = [r.mot, ...livre];
    setLivre(suite); setMot(''); setNom('');
    if ('local' in r) ecrireLocal(`dan${m}.livre`, suite);
  };
  const suggerer = async () => {
    const t = idee.trim(); if (!t || envoi) return;
    const r = await poster('suggestion', t);
    if (!r) return;
    const suite = [...suggestions, r.mot.texte];
    setSuggestions(suite); setIdee('');
    if ('local' in r) ecrireLocal(`dan${m}.idees`, suite);
  };

  // ── Rendu ──
  const vars = { '--a-vif': carte.accent.vif, '--a-fond': carte.accent.fond, '--a-clair': carte.accent.clair } as React.CSSProperties;
  const rail = useMemo(() => [...carte.services, ...carte.services], [carte.services]);
  const u = carte.coeur.univers.find(x => x.cle === univers);
  const art = carte.coeur.artistes.find(a => a.nom === artiste);
  const toutesLesChansons = carte.coeur.artistes.flatMap(a => a.titres.slice(0, 1).map(t => `${t} — ${a.nom}`));
  const moi = carte.moi;
  const jours = (iso?: string) => (iso && maintenant !== null ? Math.max(0, Math.round((maintenant - new Date(iso).getTime()) / MS_JOUR)) : null);
  const mesures = [
    moi.naissance && { cle: 'naissance', label: 'Naissance', valeur: moi.naissance.split('-').reverse().join('.'), note: maintenant !== null ? `${age(moi.naissance, maintenant)} ans — calculé` : undefined, maj: jours(moi.majLe?.naissance) },
    moi.taille && { cle: 'taille', label: 'Taille', valeur: moi.taille, maj: jours(moi.majLe?.taille) },
    moi.yeux && { cle: 'yeux', label: 'Yeux', valeur: moi.yeux, maj: jours(moi.majLe?.yeux) },
  ].filter(Boolean) as { cle: string; label: string; valeur: string; note?: string; maj: number | null }[];
  const majRecente = mesures.reduce<number | null>((min, x) => (x.maj === null ? min : min === null ? x.maj : Math.min(min, x.maj)), null);
  const estChef = carte.division !== null;
  const videMsg = estChef ? 'Le chef de pôle n\'a pas encore rempli cette porte.' : 'Bientôt rempli.';

  return (
    <div className={s.scene} style={vars}>
      <div className={s.retour}>
        <Link href="/dan">← Réseau DAN</Link>
        <span>#{m}</span>
      </div>

      <div className={s.carte}>
        <div className={s.aur1} /><div className={s.aur2} /><div className={s.aur3} />
        <div className={s.grain} /><div className={s.vignette} />

        <div className={s.cadre}>
          <div className={s.verre}>
            <div className={s.ciel} aria-hidden>
              <div className={s.etoiles} /><div className={s.etoiles2} /><div className={s.filante} />
              <div className={`${s.brume} ${s.brumeA}`} /><div className={`${s.brume} ${s.brumeB}`} />
            </div>
            <div className={s.lueur} style={lueur ? { borderColor: lueur, boxShadow: `0 0 110px -30px ${lueur}, inset 0 0 80px -60px ${lueur}` } : undefined} />

            <div className={`${s.entete} ${s.rise}`} style={{ animationDelay: '.02s' }}>
              <div className={s.role}>{carte.role}</div>
              <div className={`${s.statut} ${carte.statut === 'actif' ? '' : s.statutPrep}`}>
                <span /><span>{carte.statut === 'actif' ? 'ACTIF' : 'EN PRÉPARATION'}</span>
              </div>
            </div>

            <div className={`${s.eclipseZone} ${s.rise}`} style={{ animationDelay: '.05s' }}>
              <div className={s.eclipse} role="img" aria-label={`Logo éclipse DAN — membre n°${m}`} title={`Membre n°${m} — ${carte.role.toLowerCase()}`}>
                <div className={s.eclipseHalo} />
                <div className={s.eclipseLueur}><div className={s.croissant} /></div>
                <div className={s.numero}>{m}</div>
              </div>
            </div>

            <div className={s.rise} style={{ animationDelay: '.18s', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={s.typeLigne}>
                <div className={s.type}>Type : <b>{carte.type}</b></div>
                {indice && <span className={s.indice}>3 PORTES — TOUCHE ▾</span>}
              </div>
              <div className={s.portes}>
                <button type="button" className={`${s.porte} ${s.porteCoeur}`} onClick={() => ouvrir('coeur')} aria-label="Ouvrir : ce que j'aime">
                  <span className={s.porteLabel}>CE QUE J&apos;AIME</span>
                  <span className={s.voxelScene} style={{ filter: 'drop-shadow(0 6px 12px rgba(255,77,141,.35))' }}><Voxel forme="coeur" classe={s.voxel} decalage={0} /></span>
                </button>
                <button type="button" className={`${s.porte} ${s.porteMoi}`} onClick={() => ouvrir('moi')} aria-label="Ouvrir : qui je suis">
                  <span className={s.porteLabel}>QUI JE SUIS</span>
                  <span className={s.voxelScene} style={{ filter: 'drop-shadow(0 6px 12px rgba(76,166,255,.35))' }}><Voxel forme="moi" classe={s.voxel} decalage={-1.2} /></span>
                </button>
                <button type="button" className={`${s.porte} ${s.porteJouer}`} onClick={() => ouvrir('jouer')} aria-label="Ouvrir : à toi de jouer">
                  <span className={s.porteLabel}>À TOI DE JOUER</span>
                  <span className={s.voxelScene} style={{ filter: 'drop-shadow(0 6px 12px rgba(255,216,75,.3))' }}><Voxel forme="jouer" classe={s.voxel} decalage={-2.4} /></span>
                </button>
              </div>
            </div>

            <div className={s.rise} style={{ animationDelay: '.32s', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className={s.titreSection}><span>SERVICE</span><span /></div>
              <div ref={tickRef} className={s.ticker}
                onPointerEnter={() => { pause.current = true; }}
                onPointerLeave={() => { pause.current = false; setLueur(null); }}
                onDragStart={e => e.preventDefault()}>
                <div className={s.rail}>
                  {rail.map((sv, i) => (
                    <div key={i} className={s.service} aria-hidden={i >= carte.services.length || undefined}
                      style={{ '--s': sv.couleur } as React.CSSProperties}
                      onMouseEnter={() => setLueur(sv.couleur)} onMouseLeave={() => setLueur(null)}>
                      <div className={s.serviceNom}>{sv.nom}</div>
                      <span className={s.serviceIco}><IconeTrait nom={sv.icone} /></span>
                      <div className={s.serviceDesc}>{sv.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }} />
            <Link href={carte.cta.href} className={`${s.cta} ${s.rise}`} style={{ animationDelay: '.46s' }}>{carte.cta.label}</Link>
          </div>
        </div>

        {/* ── Porte ♥ : Ce que j'aime ── */}
        {porte === 'coeur' && (
          <div className={s.voile} onClick={fermer}>
            <div className={s.panneau} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ce que j'aime">
              <TetePanneau titre="CE QUE J'AIME" sous={`GOÛTS — ${carte.coeur.univers.length || 6} UNIVERS`} fermer={fermer} />
              {carte.coeur.univers.length === 0 ? (
                <div className={s.defile}><div className={s.vide}>{videMsg}</div></div>
              ) : (<>
                <div className={s.onglets} role="tablist">
                  {carte.coeur.univers.map(x => (
                    <button key={x.cle} type="button" role="tab" aria-selected={univers === x.cle}
                      className={`${s.univers} ${univers === x.cle ? s.universOn : ''}`} onClick={() => setUnivers(x.cle)}>
                      <span className={s.universIco}><IconeUnivers cle={x.cle} /></span>
                      <span className={s.universLabel}>{x.label.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
                <div className={s.defile}>
                  {univers === 'mus' ? (<>
                    {carte.coeur.artistes.length > 0 ? (<>
                      <div className={s.sTitre}><span>ARTISTES</span><span /></div>
                      <div className={s.rangee}>
                        {carte.coeur.artistes.map(a => (
                          <button key={a.nom} type="button" className={`${s.artiste} ${artiste === a.nom ? s.artisteOn : ''}`}
                            onClick={() => setArtiste(artiste === a.nom ? null : a.nom)} aria-pressed={artiste === a.nom}>
                            <span className={s.artisteIni}>{a.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                            <span className={s.artisteNom}>{a.nom}</span>
                          </button>
                        ))}
                      </div>
                      <div className={s.sTitre}>
                        <span>{art ? `TITRES — ${art.nom.toUpperCase()}` : 'MES SONS DU MOMENT'}</span><span />
                        <em>{art ? 'retape pour tout revoir' : 'tape un artiste pour ses titres'}</em>
                      </div>
                      <div className={s.titres}>
                        {(art ? art.titres : toutesLesChansons).map((t, i) => (
                          <div key={t} className={s.titreLigne}><span>{String(i + 1).padStart(2, '0')}</span><span>{t}</span></div>
                        ))}
                      </div>
                    </>) : <div className={s.vide}>{videMsg}</div>}
                  </>) : u && (<>
                    {u.intro && <div className={s.intro}>{u.intro}</div>}
                    {u.sections.map(sec => (
                      <div key={sec.titre} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                        {u.sections.length > 1 && <div className={s.sTitre}><span>{sec.titre.toUpperCase()}</span><span /></div>}
                        {sec.items.length > 0 ? (
                          <div className={s.rangee}>{sec.items.map(it => <span key={it} className={s.puce}>{it}</span>)}</div>
                        ) : <div className={s.vide}>{videMsg}</div>}
                      </div>
                    ))}
                  </>)}
                </div>
              </>)}
            </div>
          </div>
        )}

        {/* ── Porte i : Qui je suis ── */}
        {porte === 'moi' && (
          <div className={s.voile} onClick={fermer}>
            <div className={`${s.panneau} ${s.pMoi}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Qui je suis">
              <TetePanneau titre="QUI JE SUIS" sous="ID CARD" fermer={fermer} />
              <div className={s.defile} style={{ gap: 11, paddingTop: 14 }}>
                {mesures.length > 0 && (<>
                  <div className={s.mesures}>
                    {mesures.map(x => (
                      <div key={x.cle} className={s.mesure} title={x.maj !== null ? `Actualisé il y a ${x.maj} j` : undefined}>
                        {x.maj !== null && <i style={{ background: fraicheur(x.maj) }} />}
                        <span className={s.mLabel}>{x.label}</span>
                        <span className={s.mValeur}>{x.valeur}</span>
                        {x.note && <span className={s.mNote}>{x.note}</span>}
                      </div>
                    ))}
                  </div>
                  {majRecente !== null && (
                    <span className={s.fraicheur} title="Pastilles : vert < 30 j · orange < 90 j · rouge au-delà">DERNIÈRE MAJ IL Y A {majRecente} J</span>
                  )}
                </>)}
                {moi.infos.length > 0 && (
                  <div className={s.infos}>
                    {moi.infos.map(x => <div key={x.label} className={s.info}><span>{x.label}</span><span>{x.valeur}</span></div>)}
                  </div>
                )}
                {moi.timeline.length > 0 ? (
                  <div className={s.timeline}>
                    <span>TIMELINE</span>
                    <div className={s.etapes}>
                      {moi.timeline.map(e => <div key={e.annee + e.texte} className={s.etape}><i /><div>{e.annee}</div><div>{e.texte}</div></div>)}
                    </div>
                  </div>
                ) : estChef && <div className={s.vide}>{videMsg}</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── Porte + : À toi de jouer ── */}
        {porte === 'jouer' && (
          <div className={s.voile} onClick={fermer}>
            <div className={`${s.panneau} ${s.pJouer}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="À toi de jouer">
              <TetePanneau titre="À TOI DE JOUER" sous="LE VISITEUR PARTICIPE" fermer={fermer} />
              <div className={s.onglets} role="tablist">
                {([['arc', 'ARCADE'], ['chk', 'CHECKLIST'], ['liv', 'LIVRE D\'OR'], ['fla', 'FLASHBACK']] as [OngletJouer, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={ongletJ === k}
                    className={`${s.onglet} ${ongletJ === k ? s.ongletOn : ''}`} onClick={() => setOngletJ(k)}>{l}</button>
                ))}
              </div>
              <div className={s.defile} style={{ gap: 8 }}>
                {ongletJ === 'arc' && (carte.jouer.defis.length > 0
                  ? <div className={s.liste}>{carte.jouer.defis.map(d => <div key={d} className={s.ligne}>{d}</div>)}</div>
                  : <div className={s.vide}>Les défis arrivent bientôt — reviens taper la carte.</div>)}

                {ongletJ === 'chk' && (<>
                  {carte.jouer.checklist.length > 0
                    ? <div className={s.liste}>{carte.jouer.checklist.map(d => <div key={d} className={s.ligne}>☐ {d}</div>)}</div>
                    : <div className={s.vide}>{videMsg}</div>}
                  <div className={s.sTitre} style={{ marginTop: 6 }}><span>VŒUX — À ACHETER</span><span /></div>
                  {carte.jouer.voeux.length > 0
                    ? <div className={s.liste}>{carte.jouer.voeux.map(d => <div key={d} className={s.ligne}>{d}</div>)}</div>
                    : <div className={s.vide}>{videMsg}</div>}
                  <div className={s.sTitre} style={{ marginTop: 6 }}><span>SUGGESTIONS VISITEURS</span><span /></div>
                  {suggestions.length > 0 && <div className={s.liste}>{suggestions.map((d, i) => <div key={i} className={s.ligne}>{d}</div>)}</div>}
                  <form className={s.saisie} onSubmit={e => { e.preventDefault(); suggerer(); }}>
                    <input className={s.champ} value={idee} maxLength={200} onChange={e => setIdee(e.target.value)} placeholder="Suggère une idée à ajouter…" aria-label="Ta suggestion" />
                    <button type="submit" className={s.plus} disabled={!idee.trim() || envoi} aria-label="Ajouter la suggestion">+</button>
                  </form>
                </>)}

                {ongletJ === 'liv' && (<>
                  <form style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onSubmit={e => { e.preventDefault(); signer(); }}>
                    <input className={s.champ} value={nom} maxLength={40} onChange={e => setNom(e.target.value)} placeholder="Ton nom" aria-label="Ton nom" />
                    <input className={s.champ} value={mot} maxLength={280} onChange={e => setMot(e.target.value)} placeholder="Laisse un mot sur la carte…" aria-label="Ton mot" />
                    <button type="submit" className={s.signer} disabled={!mot.trim() || envoi}>SIGNER</button>
                  </form>
                  {livre.length === 0
                    ? <div className={s.vide}>Personne n&apos;a encore signé. Sois le premier.</div>
                    : livre.map((g, i) => (
                      <div key={i} className={s.mot}>
                        <div className={s.motTete}><span>{g.nom}</span><span>{dateCourte(g.date)}</span></div>
                        <div className={s.motTexte}>{g.texte}</div>
                      </div>
                    ))}
                </>)}

                {ongletJ === 'fla' && (<>
                  <div className={s.intro}>Les extraits vidéo arriveront ici. En attendant, une image souvenir par case.</div>
                  {carte.jouer.flashback.length > 0 ? (
                    <div className={s.flash}>
                      {carte.jouer.flashback.map(f => (
                        <div key={f.legende} className={s.souvenir}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {f.src ? <img src={f.src} alt={f.legende} loading="lazy" /> : f.legende}
                        </div>
                      ))}
                    </div>
                  ) : <div className={s.vide}>{videMsg}</div>}
                </>)}

                {horsLigne && (ongletJ === 'liv' || ongletJ === 'chk') && (
                  <div className={s.note}>Hors ligne : ton mot est gardé sur cet appareil.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={s.pied}>RÉSEAU DAN · NICE · CANNES · MONACO</div>
    </div>
  );
}

function TetePanneau({ titre, sous, fermer }: { titre: string; sous: string; fermer: () => void }) {
  return (
    <div className={s.pTete}>
      <span className={s.pPoint} />
      <div className={s.pTitres}>
        <div className={s.pTitre}>{titre}</div>
        <div className={s.pSous}>{sous}</div>
      </div>
      <button type="button" className={s.fermer} onClick={fermer} aria-label="Fermer">✕</button>
    </div>
  );
}
