import { Button, Disclosure, Tabs } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/** Detalle del trámite: requisitos plegables y datos en pestañas. */
export function TramiteDetail() {
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
          { id: 'costos', label: 'Costos', content: <p>Costo del trámite: {selected.cost}.</p> },
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
