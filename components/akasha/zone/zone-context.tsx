'use client';
// components/akasha/zone/zone-context.tsx — contrat de sélection des « zones » (refonte).
// UNE surface vivante + UN panneau canal : tout élément interactif de la surface appelle
// select(...) et le canal se re-scope. null = état par défaut (identité). Le provider est
// posé par chaque Zone (CharacterZone aujourd'hui, cartes/hubs aux lots suivants).
import { createContext, useContext, useState, type ReactNode } from 'react';

/** Sélection courante d'une zone — discriminée par `kind`, payload libre par famille. */
export type ZoneSelection =
  | { kind: 'forme'; index: number }
  | { kind: 'technique'; name: string; slug?: string; signature?: boolean }
  | { kind: 'famille'; rel: string; name: string; slug?: string }
  | { kind: 'appartenance'; attr: string; label: string; value: string }
  | null;

interface ZoneCtx {
  sel: ZoneSelection;
  select: (s: ZoneSelection) => void;
}

const Ctx = createContext<ZoneCtx>({ sel: null, select: () => {} });

export function ZoneProvider({ children }: { children: ReactNode }) {
  const [sel, select] = useState<ZoneSelection>(null);
  return <Ctx.Provider value={{ sel, select }}>{children}</Ctx.Provider>;
}

export const useZone = () => useContext(Ctx);
