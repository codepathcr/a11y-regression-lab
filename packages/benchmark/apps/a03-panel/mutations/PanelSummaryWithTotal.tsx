import { TICKETS } from '../store/panel-context';

/**
 * DIVERGENCIA BENIGNA · alta de contenido con marcado correcto
 *
 * Se agrega una entrada de total a la lista de definiciones del resumen. El
 * marcado es el mismo patrón que las tres entradas que ya existían, con su `dt`
 * y su `dd`.
 *
 * El contenido nuevo aparece en el primer render y no como respuesta a una
 * interacción, y esa distinción es la que lo hace benigno: revelar contenido al
 * accionar un control sin anunciarlo sí sería una regresión del criterio 4.1.3,
 * y es exactamente el defecto que planta el operador correspondiente. El par
 * obliga a distinguir las dos cosas.
 */
export function PanelSummaryWithTotal() {
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
        <div>
          <dt>Total</dt>
          <dd>{TICKETS.length}</dd>
        </div>
      </dl>
    </section>
  );
}
