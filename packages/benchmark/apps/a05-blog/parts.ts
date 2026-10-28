import type { BlogParts } from './App';
import { SearchBar } from './components/SearchBar';
import { PostList } from './components/PostList';
import { Pagination } from './components/Pagination';
import { Announcer } from './components/Announcer';

/** Mapa de partes de la versión base. Debe pasar axe-core sin hallazgos. */
export const baseParts: BlogParts = { SearchBar, PostList, Pagination, Announcer };
