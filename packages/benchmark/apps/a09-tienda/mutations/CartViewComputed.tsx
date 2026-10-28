import { useRef } from 'react';
import { Button } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';
import type { CartLine } from '../store/store-context';

/**
 * CONTROL NEGATIVO · reorganización del cálculo sin cambio en el DOM
 *
 * El total pasa de un `reduce` en línea a dos funciones auxiliares, y la fila de
 * la tabla se extrae a un componente interno. El marcado resultante es idéntico
 * al de la base, elemento por elemento y atributo por atributo, y el manejo del
 * foco al retirar un producto se conserva.
 *
 * Es el control negativo más exigente de la app: cambia la estructura del código
 * sin cambiar nada observable, de modo que cualquier divergencia es ruido del
 * instrumento o un defecto de normalización. Es la clase de cambio que detectó
 * los tres defectos de normalización del estudio.
 */
function lineSubtotal(line: CartLine): number {
  return line.product.price * line.quantity;
}

function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export function CartViewComputed() {
  const { cart, removeFromCart, setCheckoutOpen, goTo } = useStore();
  const headingRef = useRef<HTMLHeadingElement>(null);

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
              <td>{lineSubtotal(line)} dólares</td>
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

      <p className="tienda__total">Total: {cartTotal(cart)} dólares</p>
      <Button variant="primary" onClick={() => setCheckoutOpen(true)} data-testid="ir-a-pagar">
        Ir a pagar
      </Button>
    </section>
  );
}
