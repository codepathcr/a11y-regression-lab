import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Dialog, TextField } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/**
 * MUTACIÓN · CCB, Change Context on Blur · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.1
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F9— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: abandonar el campo de identificación **abre el diálogo de
 * confirmación** si los dos campos están completos. Un diálogo modal retiene el
 * foco y vuelve inerte el resto de la página, de modo que la persona que solo
 * quiso tabular al siguiente control se encuentra encerrada en un contexto que
 * no pidió.
 *
 * Es el caso más desorientador de CCB en el benchmark, por encima del de
 * `a06-equipo`: allí la acción irreversible se ejecuta, aquí no se ejecuta pero
 * el contexto queda capturado, y salir exige descubrir que hay un diálogo y que
 * Escape lo cierra.
 *
 * Quinto anfitrión del operador.
 */
export function TramiteFormConfirmOnBlur() {
  const { selected, confirmOpen, setConfirmOpen, submit, goTo } = usePortal();
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nombre.trim().length === 0) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (cedula.trim().length < 9) {
      setError('El número de identificación debe tener al menos nueve dígitos.');
      return;
    }

    setError(null);
    setConfirmOpen(true);
  }

  return (
    <section aria-labelledby="solicitud-titulo">
      <h2 id="solicitud-titulo">Solicitud de {selected?.name ?? 'trámite'}</h2>

      <form onSubmit={onSubmit} noValidate>
        <TextField
          label="Nombre completo"
          value={nombre}
          error={error && nombre.trim().length === 0 ? error : null}
          data-testid="solicitud-nombre"
          onChange={(event) => setNombre(event.target.value)}
        />
        <TextField
          label="Número de identificación"
          hint="Sin guiones ni espacios."
          value={cedula}
          error={error && nombre.trim().length > 0 ? error : null}
          data-testid="solicitud-cedula"
          onChange={(event) => setCedula(event.target.value)}
          onBlur={() => {
            if (nombre.trim().length > 0 && cedula.trim().length >= 9) setConfirmOpen(true);
          }}
        />
        <div className="portal__acciones">
          <Button type="submit" variant="primary" data-testid="solicitud-enviar">
            Revisar y presentar
          </Button>
          <Button onClick={() => goTo('detalle')} data-testid="solicitud-volver">
            Volver al detalle
          </Button>
        </div>
      </form>

      <Dialog
        open={confirmOpen}
        title="Confirmar la presentación"
        onClose={() => setConfirmOpen(false)}
      >
        <p>
          Vas a presentar {selected?.name ?? 'el trámite'} a nombre de {nombre}. No podrás
          modificarlo después.
        </p>
        <div className="portal__acciones">
          <Button data-autofocus variant="primary" onClick={submit} data-testid="confirmar-presentar">
            Presentar
          </Button>
          <Button onClick={() => setConfirmOpen(false)} data-testid="confirmar-cancelar">
            Revisar de nuevo
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
