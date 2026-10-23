/**
 * Navegación principal. Incluye enlace de salto al contenido, que es el primer
 * elemento tabulable de la página: sin él, quien navega por teclado tiene que
 * recorrer toda la navegación en cada carga.
 */
export function SiteNav() {
  return (
    <header className="landing__header">
      <a href="#contenido" className="landing__skip">
        Saltar al contenido
      </a>
      <nav aria-label="Principal">
        <ul className="landing__nav">
          <li>
            <a href="#servicios">Servicios</a>
          </li>
          <li>
            <a href="#preguntas">Preguntas frecuentes</a>
          </li>
          <li>
            <a href="#contacto">Contacto</a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
