import { createContext, useContext } from 'react';

export const REASONS = [
  { id: 'factura', label: 'Problema con una factura' },
  { id: 'acceso', label: 'No puedo entrar a mi cuenta' },
  { id: 'producto', label: 'Consulta sobre un producto' },
];

export interface SupportState {
  reason: string | null;
  setReason: (reason: string) => void;
  detail: string;
  setDetail: (detail: string) => void;
  extra: string;
  setExtra: (extra: string) => void;
  error: string | null;
  sent: boolean;
  send: () => void;
  announcement: string;
}

export const SupportContext = createContext<SupportState | null>(null);

export function useSupport(): SupportState {
  const value = useContext(SupportContext);
  if (!value) throw new Error('useSupport debe usarse dentro de SupportProvider');
  return value;
}
