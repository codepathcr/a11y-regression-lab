import type { PortalParts } from './App';
import { PortalHeader } from './components/PortalHeader';
import { ViewHeading } from './components/ViewHeading';
import { TramiteSearch } from './components/TramiteSearch';
import { TramiteDetail } from './components/TramiteDetail';
import { TramiteForm } from './components/TramiteForm';
import { MyTramites } from './components/MyTramites';
import { Announcer } from './components/Announcer';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: PortalParts = {
  PortalHeader,
  ViewHeading,
  TramiteSearch,
  TramiteDetail,
  TramiteForm,
  MyTramites,
  Announcer,
};
