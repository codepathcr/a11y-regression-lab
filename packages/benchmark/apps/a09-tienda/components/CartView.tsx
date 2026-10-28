import { useRef } from 'react';
import { Button } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * Carrito con el detalle de líneas, el total y la entrada al pago.
 *
 * Al retirar un producto su fila desaparece y con ella el botón que tenía el
 * foco. Si no se hace nada, el foco cae al cuerpo del documento. Por eso se
 * mueve de forma explícita al encabezado de la sección, que es el contexto más
 * cercano que sigue existiendo.
 */
export function CartView() {
  const { cart, removeFromCart, setCheckoutOpen, goTo } = useStore();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  if (cart.length === 0) {
    return (
      <section aria-labelledby="carrito-titulo">
        <h2 id="carrito-titulo">Carrito</h2>
        <p>El carrito está vacío.</p>
        <Button onClick={() => goTo('catalogo')} data-testid="carrito-volver">
          Ver el catálogo
        </Button>
      </section>
    );
  }

  return (
    <section aria-labelledby="carrito-titulo">
      <h2 id="carrito-titulo" ref={headingRef} tabIndex={-1}>
        Carrito
      </h2>
      <table className="tienda__tabla">
        <caption>Artículos en el carrito</caption>
        <thead>
          <tr>
            <th scope="col">Producto</th>
            <th scope="col">Cantidad</th>
            <th scope="col">Precio</th>
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((line) => (
            <tr key={line.product.id}>
              <td>{line.product.name}</td>
              <td>{line.quantity}</td>
              <td>{line.product.price * line.quantity} dólares</td>
              <td>
                <Button
                  aria-label={`Retirar ${line.product.name} del carrito`}
                  data-testid={`retirar-${line.product.id}`}
                  onClick={() => {
                    removeFromCart(line.product.id);
                    headingRef.current?.focus();
                  }}
                >
                  Retirar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="tienda__total">Total: {total} dólares</p>
      <Button variant="primary" onClick={() => setCheckoutOpen(true)} data-testid="ir-a-pagar">
        Ir a pagar
      </Button>
    </section>
  );
}
