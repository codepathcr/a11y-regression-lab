import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { STEPS, WizardContext } from './wizard-context';
import type { WizardState, WizardValues } from './wizard-context';

const EMPTY: WizardValues = { nombre: '', correo: '', institucion: '', tema: '' };

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<WizardValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  function validate(current: number): string | null {
    if (current === 0) {
      if (values.nombre.trim().length === 0) return 'El nombre es obligatorio.';
      if (!values.correo.includes('@')) return 'El correo electrónico debe incluir una arroba.';
    }
    if (current === 1 && values.tema.trim().length === 0) {
      return 'Indicá el tema de tu propuesta.';
    }
    return null;
  }

  const value = useMemo<WizardState>(
    () => ({
      step,
      values,
      setValue: (field: keyof WizardValues, next: string) => {
        setValues((current) => ({ ...current, [field]: next }));
      },
      error,
      next: () => {
        const problem = validate(step);
        if (problem) {
          setError(problem);
          setAnnouncement(problem);
          return;
        }
        setError(null);
        if (step === STEPS.length - 1) {
          setSubmitted(true);
          setAnnouncement('Propuesta enviada.');
          return;
        }
        const nextStep = step + 1;
        setStep(nextStep);
        setAnnouncement(`Paso ${nextStep + 1} de ${STEPS.length}: ${STEPS[nextStep].label}.`);
      },
      back: () => {
        if (step === 0) return;
        const previous = step - 1;
        setError(null);
        setStep(previous);
        setAnnouncement(`Paso ${previous + 1} de ${STEPS.length}: ${STEPS[previous].label}.`);
      },
      submitted,
      announcement,
    }),
    [step, values, error, submitted, announcement]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}
