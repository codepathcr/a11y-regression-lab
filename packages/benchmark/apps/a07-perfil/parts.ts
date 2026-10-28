import type { ProfileParts } from './App';
import { ProfileTabs } from './components/ProfileTabs';
import { SaveBar } from './components/SaveBar';
import { Announcer } from './components/Announcer';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: ProfileParts = { ProfileTabs, SaveBar, Announcer };
