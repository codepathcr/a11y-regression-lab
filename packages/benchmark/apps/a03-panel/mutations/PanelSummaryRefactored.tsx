import { useMemo } from 'react';
import { TICKETS } from '../store/panel-context';
import type { Ticket } from '../store/panel-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Segundo control de esta app, y a propósito de otro tipo que el primero: en
 * lugar de reestructurar el DOM, cambia **cómo se calcula** lo que se muestra.
 * Los tres recuentos pasan de tres filtrados sucesivos a una sola reducción
 * memorizada, y cada par de término y descripción se extrae a un componente.
 *
 * El resultado visible, la semántica de la lista de definiciones y los nombres
 * accesibles son idénticos. Importa tener un control negativo de este tipo:
 * un benchmark cuyos controles negativos sean todos reestructuraciones del DOM
 * mediría una sola cosa, y daría la impresión de que la normalización semántica
 * resuelve cualquier cambio inocuo.
 */
function Metric({ term, value }: { term: string; value: number }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function PanelSummaryRefactored() {
  const counts = useMemo(
    () =>
      TICKETS.reduce<Record<Ticket['state'], number>>(
        (acc, ticket) => ({ ...acc, [ticket.state]: acc[ticket.state] + 1 }),
        { abierto: 0, 'en curso': 0, cerrado: 0 }
      ),
    []
  );

  return (
    <section aria-labelledby="resumen-titulo">
      <h2 id="resumen-titulo">Resumen</h2>
      <dl className="panel__resumen">
        <Metric term="Abiertas" value={counts.abierto} />
        <Metric term="En curso" value={counts['en curso']} />
        <Metric term="Cerradas" value={counts.cerrado} />
      </dl>
    </section>
  );
}
