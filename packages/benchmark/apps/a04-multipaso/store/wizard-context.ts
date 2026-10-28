import { createContext, useContext } from 'react';

export interface WizardValues {
  nombre: string;
  correo: string;
  institucion: string;
  tema: string;
}

export const STEPS = [
  { id: 'datos', label: 'Tus datos' },
  { id: 'propuesta', label: 'Tu propuesta' },
  { id: 'revision', label: 'Revisión' },
];

export interface WizardState {
  step: number;
  values: WizardValues;
  setValue: (field: keyof WizardValues, value: string) => void;
  error: string | null;
  next: () => void;
  back: () => void;
  submitted: boolean;
  announcement: string;
}

export const WizardContext = createContext<WizardState | null>(null);

export function useWizard(): WizardState {
  const value = useContext(WizardContext);
  if (!value) throw new Error('useWizard debe usarse dentro de WizardProvider');
  return value;
}
