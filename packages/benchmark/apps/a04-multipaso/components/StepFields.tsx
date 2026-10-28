import { useEffect, useRef } from 'react';
import { TextField } from '@a11y-lab/ui';
import { STEPS, useWizard } from '../store/wizard-context';

/**
 * Campos del paso activo, con el encabezado que recibe el foco al avanzar.
 *
 * Al cambiar de paso el contenido se reemplaza por completo sin que la URL
 * cambie. Mover el foco al encabezado del paso nuevo es lo que permite a quien
 * usa teclado o lector de pantalla saber dónde está. Sin eso el foco queda en
 * el botón "Continuar", que ahora pertenece a otro paso.
 *
 * No se mueve el foco en el primer render.
 */
export function StepFields() {
  const { step, values, setValue, error, submitted } = useWizard();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

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
      <h2 ref={headingRef} tabIndex={-1}>
        {STEPS[step].label}
      </h2>

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
