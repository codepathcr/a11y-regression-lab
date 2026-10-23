import type { LandingParts } from './App';
import { SiteNav } from './components/SiteNav';
import { ServicesSection } from './components/ServicesSection';
import { FaqSection } from './components/FaqSection';
import { ContactForm } from './components/ContactForm';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: LandingParts = {
  SiteNav,
  ServicesSection,
  FaqSection,
  ContactForm,
};
