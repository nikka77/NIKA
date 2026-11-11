// app/dan/page.tsx — index du Réseau DAN : la carte 0 et les neuf cartes de pôle.
import type { Metadata } from 'next';
import Link from 'next/link';
import { CARTES, DIVISIONS } from '@/lib/dan/cartes';
import s from '@/components/dan/CartePhygitale.module.css';

export const metadata: Metadata = {
  title: 'Réseau DAN — les cartes 0 à 9',
  description: 'Le fondateur et les neuf pôles du Réseau DAN, sur la Côte d\'Azur.',
};

export default function DanIndex() {
  const vars = { '--a-vif': '#22E04B', '--a-fond': '#17C24E', '--a-clair': '#3BF06A' } as React.CSSProperties;
  return (
    <div className={s.scene} style={vars}>
      <main className={s.index}>
        <div className={s.retour} style={{ width: '100%', padding: 0 }}>
          <Link href="/">← NIKA</Link>
          <span>NICE · CANNES · MONACO</span>
        </div>
        <header className={s.indexTete}>
          <h1>RÉSEAU DAN</h1>
          <p>Dix cartes. Le 0 fonde et valide, les pôles 1 à 9 tiennent chacun un métier. Un prestataire porte le chiffre de son pôle suivi de son rang d&apos;arrivée : le 3e réparateur est le 63.</p>
        </header>
        <div className={s.vignettes}>
          {CARTES.map(c => {
            const div = c.division ? DIVISIONS[c.division] : null;
            return (
              <Link key={c.matricule} href={`/dan/${c.matricule}`} className={s.vignette} style={{ '--v': c.accent.vif } as React.CSSProperties}>
                <span className={s.vStatut} style={{ background: c.statut === 'actif' ? '#22E04B' : '#FFC24B' }} title={c.statut === 'actif' ? 'Actif' : 'En préparation'} />
                <span className={s.vNum}>{c.matricule}</span>
                <span className={s.vNom}>{div ? div.nom : 'Fondateur'}</span>
                <span className={s.vRole}>{div ? div.accroche : 'La carte modèle, garante de la qualité du réseau.'}</span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
