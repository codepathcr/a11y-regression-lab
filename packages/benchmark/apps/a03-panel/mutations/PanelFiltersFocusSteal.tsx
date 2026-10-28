import { Combobox } from '@a11y-lab/ui';
import { STATES, usePanel } from '../store/panel-context';

/**
 * MUTACIÓN · CCS, Change Context on Selection · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.2
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F37— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: al seleccionar un estado en el combo, el foco se traslada por
 * la fuerza al encabezado de la tabla. La persona eligió un valor en un control
 * y terminó en otro sitio de la página, sin haberlo pedido.
 *
 * Es una variante distinta de la de a09-tienda, donde la selección cambia de
 * vista entera. Acá el cambio es más sutil y por eso más interesante: la página
 * no se reemplaza, solo se mueve el foco. Es el caso que un revisor humano
 * descarta como "mejora de usabilidad" sin notar que rompe el criterio 3.2.2.
 *
 * Segundo anfitrión del operador.
 */
export function PanelFiltersFocusSteal() {
  const { setState } = usePanel();

  return (
    <section aria-labelledby="filtros-titulo">
      <h2 id="filtros-titulo">Filtros</h2>
      <Combobox
        label="Estado de la incidencia"
        options={STATES.map((s) => ({ id: s.id, label: s.label }))}
        onSelect={(option) => {
          setState(option.id);
          const heading = document.getElementById('tabla-titulo');
          if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus();
          }
        }}
      />
    </section>
  );
}
