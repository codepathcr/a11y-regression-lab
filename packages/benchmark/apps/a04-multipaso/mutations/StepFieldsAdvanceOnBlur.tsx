import { useEffect, useRef } from 'react';
import { TextField } from '@a11y-lab/ui';
import { STEPS, useWizard } from '../store/wizard-context';

/**
 * MUTACIÓN · CCB, Change Context on Blur · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.1
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F9— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: abandonar el **último campo del paso** avanza al paso
 * siguiente de forma automática. La persona solo quiso tabular hacia el botón y
 * el formulario entero cambió debajo de ella.
 *
 * Es la operacionalización más severa de CCB en el benchmark, y por eso vale
 * tenerla: en a09-tienda el cambio de contexto es la inserción de un bloque
 * dentro del mismo diálogo, mientras aquí el contexto cambia por completo. Dos
 * magnitudes del mismo operador permiten ver si el detector depende de que el
 * cambio sea grande.
 *
 * Lo que pretende ser una comodidad —"avanzamos solos para ahorrarte un clic"—
 * es exactamente lo que el criterio 3.2.1 prohíbe.
 */
export function StepFieldsAdvanceOnBlur() {
  const { step, values, setValue, error, submitted, next } = useWizard();
  const advancing = useRef(false);

  useEffect(() => {
    advancing.current = false;
  }, [step]);

  function advance() {
    if (advancing.current) return;
    advancing.current = true;
    next();
  }

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
            onBlur={advance}
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
            onBlur={advance}
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
