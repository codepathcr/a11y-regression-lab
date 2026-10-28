import type { ComponentType } from 'react';
import { LiveRegion } from '@a11y-lab/ui';
import { useSupport } from './store/support-context';
import './app.css';

export interface SupportParts {
  ReasonPicker: ComponentType;
  SupportForm: ComponentType;
}

export interface AppProps {
  parts: SupportParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { announcement } = useSupport();
  const { ReasonPicker, SupportForm } = parts;

  return (
    <div className="contacto">
      <main id="contenido">
        <h1>Escribinos</h1>
        <p className="contacto__lead">
          Contestamos de lunes a viernes, de ocho de la mañana a cinco de la tarde.
        </p>
        <ReasonPicker />
        <SupportForm />
        <LiveRegion message={announcement} />
      </main>
    </div>
  );
}
