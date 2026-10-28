import type { WizardParts } from './App';
import { StepIndicator } from './components/StepIndicator';
import { StepFields } from './components/StepFields';
import { StepNav } from './components/StepNav';
import { Announcer } from './components/Announcer';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: WizardParts = { StepIndicator, StepFields, StepNav, Announcer };
