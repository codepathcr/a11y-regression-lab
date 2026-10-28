import { Button, Disclosure, Tabs } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/**
 * MUTACIÓN · CCS, Change Context on Selection · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.2
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F37— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: seleccionar la pestaña "Costos" deja de mostrar su panel y
 * pasa a navegar a la vista de solicitud. La persona quería leer cuánto cuesta
 * el trámite y terminó en un formulario.
 *
 * Es una operacionalización de CCS con un anfitrión distinto a los otros dos del
 * benchmark, que actúan sobre un combo. Una pestaña es un control de selección
 * cuyo contrato es explícito: muestra el panel asociado y nada más. Romperlo es
 * de los cambios de contexto más desorientadores que existen, porque el patrón
 * de pestañas promete que el resto de la página se queda quieto.
 *
 * Tercer anfitrión del operador.
 */
export function TramiteDetailNavigateOnTab() {
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
          {
            id: 'requisitos',
            label: 'Requisitos',
            content: (
              <div>
                {selected.requirements.map((requirement) => (
                  <Disclosure key={requirement} summary={requirement}>
                    <p>Presentá este documento en formato digital o en ventanilla.</p>
                  </Disclosure>
                ))}
              </div>
            ),
          },
          {
            id: 'costos',
            label: 'Costos',
            content: <CostPanel />,
          },
          { id: 'plazos', label: 'Plazos', content: <p>Plazo de resolución: {selected.days}.</p> },
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

/** Al montarse, es decir al seleccionarse la pestaña, navega a otra vista. */
function CostPanel() {
  const { goTo, selected } = usePortal();
  queueMicrotask(() => goTo('solicitud'));
  return <p>Costo del trámite: {selected?.cost ?? ''}.</p>;
}
