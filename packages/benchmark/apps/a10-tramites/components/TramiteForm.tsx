import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Dialog, TextField } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/**
 * Formulario de la solicitud, con confirmación en diálogo modal.
 *
 * El diálogo concentra la retención del foco, su devolución al cerrar y el
 * anuncio del número de referencia, que es la información que la persona
 * necesita retener. Un trámite que se presenta sin devolver un comprobante
 * legible es inservible para quien no ve la pantalla.
 */
export function TramiteForm() {
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
          <Button
            data-autofocus
            variant="primary"
            onClick={submit}
            data-testid="confirmar-presentar"
          >
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
