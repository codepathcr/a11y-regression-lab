import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Dialog, TextField } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * Pago en un diálogo modal.
 *
 * Concentra tres comportamientos que el estudio mide: la retención del foco
 * dentro del modal, su devolución al elemento que lo abrió, y el anuncio del
 * resultado de la operación. Es por eso el anfitrión más rico de las
 * mutaciones del estrato grande.
 */
export function CheckoutDialog() {
  const { checkoutOpen, setCheckoutOpen, placeOrder } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (name.trim().length === 0) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (!email.includes('@')) {
      setError('El correo electrónico debe incluir una arroba.');
      return;
    }

    setError(null);
    placeOrder();
  }

  return (
    <Dialog open={checkoutOpen} title="Datos de envío" onClose={() => setCheckoutOpen(false)}>
      <form onSubmit={onSubmit} noValidate>
        <TextField
          label="Nombre completo"
          value={name}
          error={error && name.trim().length === 0 ? error : null}
          data-autofocus
          data-testid="pago-nombre"
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          label="Correo electrónico"
          value={email}
          error={error && name.trim().length > 0 ? error : null}
          data-testid="pago-correo"
          onChange={(event) => setEmail(event.target.value)}
        />
        <div className="tienda__card-acciones">
          <Button type="submit" variant="primary" data-testid="pago-confirmar">
            Confirmar pedido
          </Button>
          <Button onClick={() => setCheckoutOpen(false)} data-testid="pago-cancelar">
            Cancelar
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
