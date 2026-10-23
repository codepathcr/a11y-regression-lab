import type { ComponentType } from 'react';
import './app.css';

/**
 * Partes intercambiables de la app. Una variante mutante provee este mismo
 * mapa con exactamente una entrada sustituida.
 */
export interface LandingParts {
  SiteNav: ComponentType;
  ServicesSection: ComponentType;
  FaqSection: ComponentType;
  ContactForm: ComponentType;
}

export interface AppProps {
  parts: LandingParts;
}

/** Composición de la app. Es idéntica en la base y en todos los mutantes: lo
 *  que cambia es siempre una de las partes, nunca el armado. */
export default function App({ parts }: AppProps) {
  const { SiteNav, ServicesSection, FaqSection, ContactForm } = parts;

  return (
    <div className="landing">
      <SiteNav />
      <main id="contenido">
        <h1>Consultoría en accesibilidad digital</h1>
        <p className="landing__lead">
          Auditamos, formamos y acompañamos equipos que quieren que su producto funcione para
          todas las personas.
        </p>
        <ServicesSection />
        <FaqSection />
        <ContactForm />
      </main>
    </div>
  );
}
