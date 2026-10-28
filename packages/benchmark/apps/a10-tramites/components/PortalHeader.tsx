import { Button, Menu } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/** Cabecera con navegación entre vistas y menú de la persona usuaria. */
export function PortalHeader() {
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
