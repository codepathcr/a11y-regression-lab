import type { Post } from '../store/blog-context';
import { useBlog } from '../store/blog-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * El artículo se extrae a un componente propio y la lista se envuelve en un
 * contenedor de maquetación. La jerarquía de encabezados, los enlaces, los
 * nombres accesibles y el orden quedan idénticos.
 *
 * El contenedor desplaza la ruta en el DOM de la lista entera, de modo que el
 * caso pone a prueba la normalización semántica.
 */
function PostCard({ post }: { post: Post }) {
  return (
    <li>
      <article>
        <h3>
          <a href={`#${post.id}`}>{post.title}</a>
        </h3>
        <p>{post.summary}</p>
        <p className="blog__etiqueta">Etiqueta: {post.tag}</p>
      </article>
    </li>
  );
}

export function PostListRefactored() {
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
      <div className="blog__lista-envoltorio">
        <ul className="blog__lista">
          {pageItems.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      </div>
    </section>
  );
}
