import { createContext, useContext } from 'react';

export interface ProfileValues {
  nombre: string;
  correo: string;
  avisosCorreo: boolean;
  avisosResumen: boolean;
  perfilPublico: boolean;
}

export interface ProfileState {
  values: ProfileValues;
  setValue: <K extends keyof ProfileValues>(field: K, value: ProfileValues[K]) => void;
  dirty: boolean;
  save: () => void;
  announcement: string;
}

export const ProfileContext = createContext<ProfileState | null>(null);

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile debe usarse dentro de ProfileProvider');
  return value;
}
