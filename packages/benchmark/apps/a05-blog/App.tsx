import type { ComponentType } from 'react';
import './app.css';

export interface BlogParts {
  SearchBar: ComponentType;
  PostList: ComponentType;
  Pagination: ComponentType;
  Announcer: ComponentType;
}

export interface AppProps {
  parts: BlogParts;
}

/** Composición de la app: solo armado, sin comportamiento propio. */
export default function App({ parts }: AppProps) {
  const { SearchBar, PostList, Pagination, Announcer } = parts;

  return (
    <div className="blog">
      <main id="contenido">
        <h1>Notas sobre accesibilidad</h1>
        <SearchBar />
        <PostList />
        <Pagination />
        <Announcer />
      </main>
    </div>
  );
}
