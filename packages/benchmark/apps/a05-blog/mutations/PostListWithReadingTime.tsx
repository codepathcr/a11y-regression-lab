import { useBlog } from '../store/blog-context';

/**
 * DIVERGENCIA BENIGNA · alta de contenido informativo por artículo
 *
 * Se agrega el tiempo estimado de lectura a cada artículo, con el mismo patrón
 * de marcado que la etiqueta que ya existía.
 *
 * El cálculo es determinista a partir del resumen, y eso es deliberado: un
 * valor aleatorio o dependiente del reloj metería ruido irreproducible en la
 * traza y el par dejaría de servir como control.
 */
export function PostListWithReadingTime() {
  const { pageItems } = useBlog();

  if (pageItems.length === 0) {
    return (
      <section aria-labelledby="resultados-titulo">
        <h2 id="resultados-titulo">Artículos</h2>
        <p>Ningún artículo coincide con la búsqueda.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="resultados-titulo">
      <h2 id="resultados-titulo">Artículos</h2>
      <ul className="blog__lista">
        {pageItems.map((post) => (
          <li key={post.id}>
            <article>
              <h3>
                <a href={`#${post.id}`}>{post.title}</a>
              </h3>
              <p>{post.summary}</p>
              <p className="blog__etiqueta">Etiqueta: {post.tag}</p>
              <p className="blog__lectura">
                Lectura de {Math.max(1, Math.round(post.summary.length / 60))} minutos
              </p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
