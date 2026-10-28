import { TextField } from '@a11y-lab/ui';
import { STEPS, useWizard } from '../store/wizard-context';

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * Se elimina el efecto que mueve el foco al encabezado del paso nuevo. El
 * contenido se reemplaza por completo y el foco se queda en el botón
 * "Continuar", que ahora pertenece a otro paso.
 *
 * El anuncio del paso activo **se conserva**, y es deliberado: aísla la pérdida
 * de foco de la falta de anuncio, que son dos defectos distintos con dos
 * operadores distintos. Un mutante que rompiera los dos a la vez no permitiría
 * atribuir la detección a ninguno.
 *
 * Cuarto anfitrión del operador. Los otros tres son el cambio de vista de
 * a09-tienda, la confirmación de a02-piscina y el remontaje del encabezado de
 * tabla de a03-panel.
 */
export function StepFieldsNoFocus() {
  const { step, values, setValue, error, submitted } = useWizard();

  if (submitted) {
    return (
      <section>
        <h2>Propuesta enviada</h2>
        <p>Te escribimos a {values.correo} en los próximos días.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 tabIndex={-1}>{STEPS[step].label}</h2>

      {step === 0 ? (
        <>
          <TextField
            label="Nombre completo"
            value={values.nombre}
            error={error && values.nombre.trim().length === 0 ? error : null}
            data-testid="nombre"
            onChange={(event) => setValue('nombre', event.target.value)}
          />
          <TextField
            label="Correo electrónico"
            value={values.correo}
            error={error && values.nombre.trim().length > 0 ? error : null}
            data-testid="correo"
            onChange={(event) => setValue('correo', event.target.value)}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <TextField
            label="Institución"
            hint="Opcional."
            value={values.institucion}
            data-testid="institucion"
            onChange={(event) => setValue('institucion', event.target.value)}
          />
          <TextField
            label="Tema de la propuesta"
            value={values.tema}
            error={error}
            data-testid="tema"
            onChange={(event) => setValue('tema', event.target.value)}
          />
        </>
      ) : null}

      {step === 2 ? (
        <dl className="paso__revision">
          <div>
            <dt>Nombre</dt>
            <dd>{values.nombre}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{values.correo}</dd>
          </div>
          <div>
            <dt>Institución</dt>
            <dd>{values.institucion || 'Sin indicar'}</dd>
          </div>
          <div>
            <dt>Tema</dt>
            <dd>{values.tema}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
