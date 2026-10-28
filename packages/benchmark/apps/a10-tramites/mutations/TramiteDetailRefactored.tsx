import type { ReactNode } from 'react';
import { Button, Disclosure, Tabs } from '@a11y-lab/ui';
import type { Tramite } from '../data/tramites';
import { usePortal } from '../store/portal-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * El contenido de cada pestaña pasa de JSX en línea a funciones auxiliares que
 * lo devuelven, y la lista de requisitos a un componente propio. **No se agrega
 * ningún nodo al DOM**: el marcado resultante es idéntico.
 *
 * Es el tipo de refactorización más común en una revisión de código —"esto se
 * leía mal, lo extraje"— y por eso vale tenerlo como control: si diera
 * diferencias, el problema estaría en la captura y no en la normalización.
 */
function RequirementList({ tramite }: { tramite: Tramite }) {
  return (
    <div>
      {tramite.requirements.map((requirement) => (
        <Disclosure key={requirement} summary={requirement}>
          <p>Presentá este documento en formato digital o en ventanilla.</p>
        </Disclosure>
      ))}
    </div>
  );
}

function costContent(tramite: Tramite): ReactNode {
  return <p>Costo del trámite: {tramite.cost}.</p>;
}

function termContent(tramite: Tramite): ReactNode {
  return <p>Plazo de resolución: {tramite.days}.</p>;
}

export function TramiteDetailRefactored() {
  const { selected, goTo } = usePortal();

  if (!selected) {
    return (
      <section aria-labelledby="detalle-vacio">
        <h2 id="detalle-vacio">Sin trámite seleccionado</h2>
        <Button onClick={() => goTo('lista')}>Volver al catálogo</Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="detalle-titulo">
      <h2 id="detalle-titulo">{selected.name}</h2>

      <Tabs
        label={`Información de ${selected.name}`}
        tabs={[
          { id: 'requisitos', label: 'Requisitos', content: <RequirementList tramite={selected} /> },
          { id: 'costos', label: 'Costos', content: costContent(selected) },
          { id: 'plazos', label: 'Plazos', content: termContent(selected) },
        ]}
      />

      <div className="portal__acciones">
        <Button variant="primary" onClick={() => goTo('solicitud')} data-testid="iniciar">
          Presentar solicitud
        </Button>
        <Button onClick={() => goTo('lista')} data-testid="detalle-volver">
          Volver al catálogo
        </Button>
      </div>
    </section>
  );
}
