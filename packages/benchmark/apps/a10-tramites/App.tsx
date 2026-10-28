import type { ComponentType } from 'react';
import { usePortal } from './store/portal-context';
import './app.css';

export interface PortalParts {
  PortalHeader: ComponentType;
  ViewHeading: ComponentType;
  TramiteSearch: ComponentType;
  TramiteDetail: ComponentType;
  TramiteForm: ComponentType;
  MyTramites: ComponentType;
  Announcer: ComponentType;
}

export interface AppProps {
  parts: PortalParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { view } = usePortal();
  const {
    PortalHeader,
    ViewHeading,
    TramiteSearch,
    TramiteDetail,
    TramiteForm,
    MyTramites,
    Announcer,
  } = parts;

  return (
    <div className="portal">
      <PortalHeader />
      <main id="contenido">
        <ViewHeading />
        {view === 'lista' ? <TramiteSearch /> : null}
        {view === 'detalle' ? <TramiteDetail /> : null}
        {view === 'solicitud' ? <TramiteForm /> : null}
        {view === 'mis' ? <MyTramites /> : null}
        <Announcer />
      </main>
    </div>
  );
}
