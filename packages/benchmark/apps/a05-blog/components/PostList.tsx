import { useBlog } from '../store/blog-context';

/** Lista de artículos de la página activa. */
export function PostList() {
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
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
