import type { SupportParts } from './App';
import { ReasonPicker } from './components/ReasonPicker';
import { SupportForm } from './components/SupportForm';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: SupportParts = { ReasonPicker, SupportForm };
