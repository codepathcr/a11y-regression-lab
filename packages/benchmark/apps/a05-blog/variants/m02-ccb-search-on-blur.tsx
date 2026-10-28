import App from '../App';
import { baseParts } from '../parts';
import { BlogProvider } from '../store/BlogProvider';
import { SearchBarSearchOnBlur } from '../mutations/SearchBarSearchOnBlur';

/** Sustituye unicamente SearchBar. Ver la cabecera del modulo mutado. */
export default function Variant() {
  return (
    <BlogProvider>
      <App parts={{ ...baseParts, SearchBar: SearchBarSearchOnBlur }} />
    </BlogProvider>
  );
}
