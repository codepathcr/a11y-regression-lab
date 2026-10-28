import type { ComponentType } from 'react';
import './app.css';

export interface WizardParts {
  StepIndicator: ComponentType;
  StepFields: ComponentType;
  StepNav: ComponentType;
  Announcer: ComponentType;
}

export interface AppProps {
  parts: WizardParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { StepIndicator, StepFields, StepNav, Announcer } = parts;

  return (
    <div className="paso">
      <main id="contenido">
        <h1>Postulación a la jornada de accesibilidad</h1>
        <StepIndicator />
        <StepFields />
        <StepNav />
        <Announcer />
      </main>
    </div>
  );
}
