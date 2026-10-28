import App from '../App';
import { baseParts } from '../parts';
import { BlogProvider } from '../store/BlogProvider';
import { PaginationKeyboardSwallow } from '../mutations/PaginationKeyboardSwallow';

/** Sustituye unicamente Pagination. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <BlogProvider>
      <App parts={{ ...baseParts, Pagination: PaginationKeyboardSwallow }} />
    </BlogProvider>
  );
}
