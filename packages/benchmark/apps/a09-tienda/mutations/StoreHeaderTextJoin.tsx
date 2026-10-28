import { Button, Menu } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * CONTROL NEGATIVO · recomposición del texto del nombre accesible
 *
 * El rótulo del botón de carrito pasa de `Carrito ({cartCount})` —que React
 * entrega al DOM como tres nodos de texto— a una sola cadena construida en una
 * función auxiliar. El nombre accesible resultante es el mismo: "Carrito (2)".
 *
 * Este control es la respuesta directa a dos defectos del estudio. El primero:
 * el árbol de accesibilidad fragmentaba el texto en nodos `StaticText` separados
 * y el par divergía sin que nada hubiera cambiado. El segundo: la regla que
 * fusionó esos nodos insertaba un espacio y partía los identificadores de
 * pedido. Ambos aparecieron en controles negativos, no en mutantes.
 *
 * Mantenerlo en el estrato grande vigila que la regla de fusión siga siendo
 * correcta cuando la cadena lleva paréntesis y un número variable.
 */
function describeCart(count: number): string {
  return `Carrito (${count})`;
}

export function StoreHeaderTextJoin() {
  const { view, goTo, cartCount } = useStore();

  return (
    <header className="tienda__header">
      <a href="#contenido" className="tienda__skip">
        Saltar al contenido
      </a>
      <div className="tienda__bar">
        <strong className="tienda__marca">Periféricos</strong>
        <nav aria-label="Principal">
          <ul className="tienda__nav">
            <li>
              <Button
                variant="ghost"
                aria-current={view === 'catalogo' ? 'page' : undefined}
                onClick={() => goTo('catalogo')}
                data-testid="nav-catalogo"
              >
                Catálogo
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                aria-current={view === 'carrito' ? 'page' : undefined}
                onClick={() => goTo('carrito')}
                data-testid="nav-carrito"
              >
                {describeCart(cartCount)}
              </Button>
            </li>
          </ul>
        </nav>
        <Menu
          label="Mi cuenta"
          items={[
            { id: 'pedidos', label: 'Mis pedidos', onSelect: () => goTo('catalogo') },
            { id: 'datos', label: 'Datos personales', onSelect: () => goTo('catalogo') },
            { id: 'salir', label: 'Cerrar sesión', onSelect: () => goTo('catalogo') },
          ]}
        />
      </div>
    </header>
  );
}
