import { Button, Menu } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * Cabecera con navegación entre vistas, menú de cuenta y acceso al carrito.
 *
 * La navegación usa `<button>` y no enlaces porque el cambio de vista ocurre en
 * la misma página sin modificar la URL: un enlace prometería un destino que no
 * existe. El estado activo se comunica con `aria-current`.
 */
export function StoreHeader() {
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
                Carrito ({cartCount})
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
