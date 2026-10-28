import type { TeamParts } from './App';
import { TeamToolbar } from './components/TeamToolbar';
import { TeamTable } from './components/TeamTable';
import { InviteDialog } from './components/InviteDialog';
import { Announcer } from './components/Announcer';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: TeamParts = { TeamToolbar, TeamTable, InviteDialog, Announcer };
