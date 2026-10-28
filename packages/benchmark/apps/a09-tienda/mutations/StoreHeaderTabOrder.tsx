import { Button, Menu } from '@a11y-lab/ui';
import { useStore } from '../store/store-context';

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * El paper define el operador por nombre y categoría —Operable / Navigable,
 * falla F44— pero no detalla la transformación. La operacionalización es propia
 * de este estudio.
 *
 * Transformación: se asigna `tabindex="-1"` al botón de acceso al carrito,
 * retirándolo del orden de tabulación. El recuento de artículos sigue visible y
 * el botón sigue funcionando con el ratón.
 *
 * En una tienda es el defecto de mayor consecuencia comercial posible: quien
 * navega por teclado puede agregar productos y no puede llegar a pagarlos. Y es
 * invisible en una revisión, porque el encabezado se ve completo.
 *
 * Séptimo anfitrión del operador.
 */
export function StoreHeaderTabOrder() {
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
                tabIndex={-1}
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
