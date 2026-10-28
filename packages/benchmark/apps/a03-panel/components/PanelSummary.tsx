import { TICKETS } from '../store/panel-context';

/** Resumen estático. Da a la traza contenido que no cambia, para verificar que
 *  el diff no reporta diferencias donde no las hay. */
export function PanelSummary() {
  const abiertas = TICKETS.filter((t) => t.state === 'abierto').length;
  const enCurso = TICKETS.filter((t) => t.state === 'en curso').length;
  const cerradas = TICKETS.filter((t) => t.state === 'cerrado').length;

  return (
    <section aria-labelledby="resumen-titulo">
      <h2 id="resumen-titulo">Resumen</h2>
      <dl className="panel__resumen">
        <div>
          <dt>Abiertas</dt>
          <dd>{abiertas}</dd>
        </div>
        <div>
          <dt>En curso</dt>
          <dd>{enCurso}</dd>
        </div>
        <div>
          <dt>Cerradas</dt>
          <dd>{cerradas}</dd>
        </div>
      </dl>
    </section>
  );
}
