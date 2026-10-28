const SERVICES = [
  { id: 'auditoria', title: 'Auditorías de accesibilidad', body: 'Revisión manual y automatizada contra las WCAG 2.2, nivel AA.' },
  { id: 'formacion', title: 'Capacitación de equipos', body: 'Talleres prácticos para equipos de desarrollo, diseño y producto.' },
  { id: 'remediacion', title: 'Remediación guiada', body: 'Acompañamiento técnico en la corrección de las barreras detectadas.' },
];

/**
 * DIVERGENCIA BENIGNA · reescritura de texto visible
 *
 * Se reescriben los títulos y las descripciones de los servicios. El marcado, la
 * jerarquía de encabezados y el orden de tabulación no cambian.
 *
 * Es el caso benigno más frecuente de un Pull Request real y el más fácil de
 * declarar: nadie discute que reescribir la copia de una página no afecta la
 * accesibilidad. La traza sí cambia, en cada paso y en varias líneas del árbol,
 * de modo que el par pasa la compuerta determinista y llega al modelo. Ahí está
 * su valor: es donde la tasa de falsos positivos del modelo existe de verdad.
 */
export function ServicesSectionReworded() {
  return (
    <section id="servicios" aria-labelledby="servicios-titulo">
      <h2 id="servicios-titulo">Servicios</h2>
      <ul className="landing__cards">
        {SERVICES.map((service) => (
          <li key={service.id}>
            <h3>{service.title}</h3>
            <p>{service.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
