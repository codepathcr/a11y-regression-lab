import { createContext, useContext } from 'react';

export interface Post {
  id: string;
  title: string;
  summary: string;
  tag: string;
}

export const POSTS: Post[] = [
  { id: 'p1', title: 'Qué mide realmente un validador automático', summary: 'Las reglas cubren una parte del problema y conviene saber cuál.', tag: 'auditoría' },
  { id: 'p2', title: 'Orden de foco: el error que nadie ve', summary: 'Cuando el recorrido por teclado deja de seguir la lectura.', tag: 'teclado' },
  { id: 'p3', title: 'Regiones live sin sobresaltos', summary: 'Anunciar lo justo, cuando corresponde y sin interrumpir.', tag: 'anuncios' },
  { id: 'p4', title: 'Modales que devuelven el foco', summary: 'Abrir es fácil; cerrar bien es lo que cuesta.', tag: 'teclado' },
  { id: 'p5', title: 'Tablas que se pueden recorrer', summary: 'Encabezados, alcance y ordenamiento anunciado.', tag: 'auditoría' },
  { id: 'p6', title: 'Formularios que explican sus errores', summary: 'Asociar el mensaje al campo y anunciarlo a tiempo.', tag: 'formularios' },
  { id: 'p7', title: 'Accesibilidad en revisiones de código', summary: 'Qué se puede verificar antes de integrar un cambio.', tag: 'proceso' },
];

export const PAGE_SIZE = 3;

export interface BlogState {
  query: string;
  setQuery: (query: string) => void;
  page: number;
  setPage: (page: number) => void;
  matches: Post[];
  pageItems: Post[];
  pageCount: number;
  announcement: string;
}

export const BlogContext = createContext<BlogState | null>(null);

export function useBlog(): BlogState {
  const value = useContext(BlogContext);
  if (!value) throw new Error('useBlog debe usarse dentro de BlogProvider');
  return value;
}
