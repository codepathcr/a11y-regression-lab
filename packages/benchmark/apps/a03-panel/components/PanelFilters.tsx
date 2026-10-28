import { Combobox } from '@a11y-lab/ui';
import { STATES, usePanel } from '../store/panel-context';

/** Filtro por estado. El recuento resultante se anuncia desde la región live
 *  de la app: sin eso, quien no ve la tabla no sabe que cambió. */
export function PanelFilters() {
  const { setState } = usePanel();

  return (
    <section aria-labelledby="filtros-titulo">
      <h2 id="filtros-titulo">Filtros</h2>
      <Combobox
        label="Estado de la incidencia"
        options={STATES.map((s) => ({ id: s.id, label: s.label }))}
        onSelect={(option) => setState(option.id)}
      />
    </section>
  );
}
