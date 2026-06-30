// types/model-viewer.d.ts — déclare le web component <model-viewer> (auto-hébergé dans
// /public/vendor/model-viewer.min.js, pas de dépendance npm) pour TSX/React 19.
// Permissif : on passe l'essentiel des attributs impérativement via setAttribute,
// donc on autorise n'importe quel attribut dashed ici.
import type React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> &
        Record<string, unknown>;
    }
  }
}
