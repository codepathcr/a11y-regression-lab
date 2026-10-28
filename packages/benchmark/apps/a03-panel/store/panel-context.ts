import { createContext, useContext } from 'react';

export interface Ticket {
  id: string;
  title: string;
  owner: string;
  state: 'abierto' | 'en curso' | 'cerrado';
  days: number;
}

export const TICKETS: Ticket[] = [
  { id: 't01', title: 'Contraste insuficiente en el pie', owner: 'Ana Pérez', state: 'abierto', days: 12 },
  { id: 't02', title: 'Foco invisible en el buscador', owner: 'Luis Mora', state: 'en curso', days: 4 },
  { id: 't03', title: 'Tabla sin encabezados', owner: 'Ana Pérez', state: 'cerrado', days: 31 },
  { id: 't04', title: 'Modal sin retención de foco', owner: 'Iris Cano', state: 'abierto', days: 7 },
  { id: 't05', title: 'Imágenes sin texto alternativo', owner: 'Luis Mora', state: 'cerrado', days: 19 },
  { id: 't06', title: 'Mensajes de error no anunciados', owner: 'Iris Cano', state: 'en curso', days: 2 },
];

export const STATES = [
  { id: 'todos', label: 'Todos los estados' },
  { id: 'abierto', label: 'Abierto' },
  { id: 'en curso', label: 'En curso' },
  { id: 'cerrado', label: 'Cerrado' },
];

export type SortColumn = 'title' | 'owner' | 'days';
export type SortDirection = 'ascending' | 'descending';

export interface PanelState {
  state: string;
  setState: (state: string) => void;
  sort: SortColumn;
  direction: SortDirection;
  toggleSort: (column: SortColumn) => void;
  rows: Ticket[];
  announcement: string;
}

export const PanelContext = createContext<PanelState | null>(null);

export function usePanel(): PanelState {
  const value = useContext(PanelContext);
  if (!value) throw new Error('usePanel debe usarse dentro de PanelProvider');
  return value;
}
