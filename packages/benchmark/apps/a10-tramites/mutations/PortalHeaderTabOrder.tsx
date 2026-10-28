import { Button, Menu } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/**
 * MUTACIÓN · CTO, Change Tab Index Order · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 2.4.3
 *
 * El paper define el operador por nombre y categoría —Operable / Navigable,
 * falla F44— pero no detalla la transformación. La operacionalización es propia
 * de este estudio.
 *
 * Transformación: se asigna `tabindex="-1"` al enlace de navegación "Mis
 * trámites", retirándolo del orden de tabulación.
 *
 * Es el caso de consecuencia más grave de este operador: quien navega por
 * teclado no puede llegar a sus propios expedientes, es decir al estado de los
 * trámites que ya presentó. El resto del portal funciona con normalidad, de modo
 * que nada sugiere que falte algo.
 *
 * Sexto anfitrión del operador.
 */
export function PortalHeaderTabOrder() {
  const { view, goTo } = usePortal();

  return (
    <header className="portal__header">
      <a href="#contenido" className="portal__skip">
        Saltar al contenido
      </a>
      <div className="portal__bar">
        <strong>Municipalidad en línea</strong>
        <nav aria-label="Principal">
          <ul className="portal__nav">
            <li>
              <Button
                variant="ghost"
                aria-current={view === 'lista' ? 'page' : undefined}
                onClick={() => goTo('lista')}
                data-testid="nav-lista"
              >
                Trámites
              </Button>
            </li>
            <li>
              <Button
                variant="ghost"
                tabIndex={-1}
                aria-current={view === 'mis' ? 'page' : undefined}
                onClick={() => goTo('mis')}
                data-testid="nav-mis"
              >
                Mis trámites
              </Button>
            </li>
          </ul>
        </nav>
        <Menu
          label="Mi cuenta"
          items={[
            { id: 'datos', label: 'Mis datos', onSelect: () => goTo('mis') },
            { id: 'salir', label: 'Cerrar sesión', onSelect: () => goTo('lista') },
          ]}
        />
      </div>
    </header>
  );
}
