import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Dialog, TextField } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * MUTACIÓN · CCB, Change Context on Blur · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.1
 *
 * El paper define el operador por su nombre y su categoría —Understandable /
 * Predictable, falla F9— pero no detalla la transformación. La
 * operacionalización es propia de este estudio; ver docs/protocolo-mutacion.md.
 *
 * Transformación: al abandonar el campo de nombre se inserta, **justo debajo de
 * él**, un bloque de opciones de envío con controles tabulables que antes no
 * existía. La persona solo movió el foco al campo siguiente.
 *
 * El punto de inserción se eligió por realismo: revelar campos dependientes
 * debajo del que se acaba de abandonar es el caso corriente —se elige el país y
 * aparece la provincia—, mientras que insertarlos por encima es raro.
 *
 * SU HUELLA EN LA TRAZA ES MÍNIMA, y conviene saber por qué. El navegador
 * resuelve el siguiente destino del foco **antes** de ejecutar el manejador de
 * blur, de modo que un cambio de contexto disparado por blur no puede alterar el
 * movimiento de foco que lo provocó. Los controles insertados quedan además en
 * una posición a la que la tabulación hacia adelante ya no vuelve. El rastro se
 * reduce entonces a una sola línea: el alta del nodo.
 *
 * Es el caso menos visible del benchmark —una línea de unas ciento setenta— y es
 * detectable únicamente porque el piso de ruido es exactamente cero. Con un piso
 * de apenas un punto porcentual, este defecto sería indistinguible del ruido.
 * Vale como medida del umbral de sensibilidad del método y como limitación a
 * declarar.
 *
 * Dentro de un diálogo modal el defecto es peor que en una página: el contenido
 * tabulable del modal cambia mientras el foco está retenido dentro de él, de
 * modo que el recorrido se reordena sin que haya forma de anticiparlo ni de
 * salir del contexto para reorientarse.
 *
 * El marcado resultante es válido en todo momento y ningún validador estático lo
 * reporta.
 */
export function CheckoutDialogContextOnBlur() {
  const { checkoutOpen, setCheckoutOpen, placeOrder } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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
          onBlur={() => setExpanded(true)}
        />

        {expanded ? (
          <fieldset>
            <legend>Opciones de envío</legend>
            <label>
              <input type="radio" name="envio" value="estandar" defaultChecked /> Estándar
            </label>{' '}
            <label>
              <input type="radio" name="envio" value="expreso" /> Expreso
            </label>
          </fieldset>
        ) : null}

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
