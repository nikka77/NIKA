// app/template.tsx — entrée de page globale.
// Contrairement à layout.tsx, template est RE-MONTÉ à chaque navigation → permet
// d'animer l'apparition de chaque page (feel app natif). Opacity SEULE (pas de
// transform) pour ne pas casser le position:fixed/sticky des enfants (cart-bar…).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
