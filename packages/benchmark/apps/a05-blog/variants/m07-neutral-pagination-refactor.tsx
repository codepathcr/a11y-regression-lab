import App from '../App';
import { baseParts } from '../parts';
import { BlogProvider } from '../store/BlogProvider';
import { PaginationRefactored } from '../mutations/PaginationRefactored';

/** Control negativo. Ver la cabecera del modulo refactorizado. */
export default function Variant() {
  return (
    <BlogProvider>
      <App parts={{ ...baseParts, Pagination: PaginationRefactored }} />
    </BlogProvider>
  );
}
