// lib/ops/non-doublons.mjs — LIRE LE REGISTRE DES PAIRES DÉJÀ RÉFUTÉES (10/08/2026).
//
// POURQUOI CE MODULE EXISTE. Les audits de doublons redésignent les mêmes paires à chaque passage :
// Kakō contre Kakkō, Maron contre Marron, les deux Wind Daimyō… Chacune a coûté une instruction
// complète — et la conclusion n'était écrite nulle part que les audits sachent lire. Écrire une
// réfutation dans un rapport n'est pas la livrer : elle n'est livrée que si l'outil qui repose la
// question la voit passer.
//
// Le registre est data/akasha-non-doublons.json. Ce module ne FILTRE rien : il annote. Un groupe
// réfuté reste dans la sortie, marqué — cacher un groupe, c'est empêcher de réviser la réfutation
// si le corpus change.
import { readFileSync } from 'node:fs';

const cleParPaire = (slugs) => [...slugs].map((s) => String(s).trim()).sort().join('≟');

/** Charge le registre. Rend une fonction (slugs[]) → entrée du registre, ou null. */
export function chargerNonDoublons(racine = process.cwd()) {
  let brut;
  try {
    brut = JSON.parse(readFileSync(`${racine}/data/akasha-non-doublons.json`, 'utf8'));
  } catch {
    // Registre absent : les audits continuent, simplement sans annotation. Ils ne doivent JAMAIS
    // échouer parce qu'un fichier de mémoire manque.
    return { taille: 0, verdict: () => null };
  }
  const index = new Map((brut.paires ?? []).map((p) => [cleParPaire(p.slugs), p]));
  return {
    taille: index.size,
    misAJour: brut.misAJour ?? null,
    /** Une paire EXACTE, ou toute paire du registre entièrement contenue dans le groupe. */
    verdict(slugs) {
      const direct = index.get(cleParPaire(slugs));
      if (direct) return direct;
      const ens = new Set(slugs.map((s) => String(s).trim()));
      for (const p of index.values()) if (p.slugs.every((s) => ens.has(s))) return p;
      return null;
    },
  };
}
