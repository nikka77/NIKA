'use client';
import { create } from 'zustand';
import type { User } from './types';

interface MapStore {
  isOpen: boolean;
  openMap: () => void;
  closeMap: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  isOpen: false,
  openMap: () => set({ isOpen: true }),
  closeMap: () => set({ isOpen: false }),
}));

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
