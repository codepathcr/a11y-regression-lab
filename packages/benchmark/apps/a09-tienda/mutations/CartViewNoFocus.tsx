import { Button } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * MUTACIÓN · pérdida de foco después de una actualización dinámica · operador
 * propio · criterio 2.4.3
 *
 * Se elimina el movimiento de foco al encabezado tras retirar un producto. La
 * fila desaparece con el botón que tenía el foco y este cae al cuerpo del
 * documento. El anuncio se conserva, para aislar este defecto del de falta de
 * anuncio.
 *
 * Octavo anfitrión del operador, y el segundo sobre una tabla con filas que se
 * eliminan, junto con `a06-equipo`. Interesa tener los dos: el mismo defecto en
 * dos tablas distintas permite comprobar que el detector no depende de la tabla
 * concreta.
 */
export function CartViewNoFocus() {
  const { cart, removeFromCart, setCheckoutOpen, goTo } = useStore();
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
      <h2 id="carrito-titulo" tabIndex={-1}>
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
                  onClick={() => removeFromCart(line.product.id)}
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
