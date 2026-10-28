import type { PanelParts } from './App';
import { PanelSummary } from './components/PanelSummary';
import { PanelFilters } from './components/PanelFilters';
import { DataTable } from './components/DataTable';
import { Announcer } from './components/Announcer';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: PanelParts = { PanelSummary, PanelFilters, DataTable, Announcer };
