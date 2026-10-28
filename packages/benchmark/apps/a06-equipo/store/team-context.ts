import { createContext, useContext } from 'react';

export type Role = 'administradora' | 'editora' | 'lectora';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  pending: boolean;
}

export const ROLES: Role[] = ['administradora', 'editora', 'lectora'];

export const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: 'Ana Pérez', email: 'ana@ejemplo.com', role: 'administradora', pending: false },
  { id: 'm2', name: 'Luis Mora', email: 'luis@ejemplo.com', role: 'editora', pending: false },
  { id: 'm3', name: 'Iris Cano', email: 'iris@ejemplo.com', role: 'lectora', pending: false },
];

export interface TeamState {
  members: Member[];
  setRole: (id: string, role: Role) => void;
  remove: (id: string) => void;
  inviteOpen: boolean;
  setInviteOpen: (open: boolean) => void;
  invite: (name: string, email: string) => void;
  announcement: string;
}

export const TeamContext = createContext<TeamState | null>(null);

export function useTeam(): TeamState {
  const value = useContext(TeamContext);
  if (!value) throw new Error('useTeam debe usarse dentro de TeamProvider');
  return value;
}
