import { createContext, useContext } from 'react';
import type { Tramite } from '../data/tramites';

export type View = 'lista' | 'detalle' | 'solicitud' | 'mis';

export interface PortalState {
  view: View;
  goTo: (view: View) => void;
  query: string;
  search: (query: string) => void;
  results: Tramite[];
  loading: boolean;
  selected: Tramite | null;
  select: (tramite: Tramite) => void;
  confirmOpen: boolean;
  setConfirmOpen: (open: boolean) => void;
  reference: string | null;
  submit: () => void;
  announcement: string;
}

export const PortalContext = createContext<PortalState | null>(null);

export function usePortal(): PortalState {
  const value = useContext(PortalContext);
  if (!value) throw new Error('usePortal debe usarse dentro de PortalProvider');
  return value;
}
