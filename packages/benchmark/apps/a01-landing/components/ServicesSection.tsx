const SERVICES = [
  { id: 'auditoria', title: 'Auditoría de accesibilidad', body: 'Revisión manual y automatizada contra WCAG 2.2.' },
  { id: 'formacion', title: 'Formación de equipos', body: 'Talleres prácticos para equipos de desarrollo y diseño.' },
  { id: 'remediacion', title: 'Remediación', body: 'Acompañamiento en la corrección de barreras detectadas.' },
];

/** Sección informativa estática. No participa de ninguna mutación: sirve para
 *  dar a la traza contenido que no cambia, y así verificar que el diff no
 *  reporta diferencias donde no las hay. */
export function ServicesSection() {
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
