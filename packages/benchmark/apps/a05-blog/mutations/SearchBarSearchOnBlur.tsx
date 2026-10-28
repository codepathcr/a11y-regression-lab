import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { useBlog } from '../store/blog-context';

/**
 * MUTACIÓN · CCB, Change Context on Blur · operador de Ma11y
 * (Tafreshipour et al., 2024) · criterio 3.2.1
 *
 * El paper define el operador por nombre y categoría —Understandable /
 * Predictable, falla F9— pero no detalla la transformación. La
 * operacionalización es propia de este estudio.
 *
 * Transformación: abandonar el campo de búsqueda **ejecuta la búsqueda**, sin
 * que la persona haya pulsado el botón ni Enter. La lista de artículos se
 * reemplaza y la paginación se reinicia porque alguien movió el foco al
 * siguiente control.
 *
 * Es el caso que más se defiende como mejora: "le ahorramos un clic". Y es
 * exactamente lo que el criterio 3.2.1 prohíbe, porque quien tabula para
 * revisar el botón antes de pulsarlo se encuentra con que el contenido ya
 * cambió.
 *
 * Tercer anfitrión del operador, junto con a09-tienda y a04-multipaso, y de una
 * magnitud intermedia entre los dos: no inserta un bloque como el primero ni
 * cambia de paso como el segundo, sino que reemplaza el contenido principal.
 */
export function SearchBarSearchOnBlur() {
  const { setQuery, matches } = useBlog();
  const [draft, setDraft] = useState('');
  const [searched, setSearched] = useState(false);

  function run() {
    setQuery(draft);
    setSearched(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run();
  }

  return (
    <search>
      <form onSubmit={onSubmit} role="search" aria-label="Buscar artículos">
        <TextField
          label="Buscar en el blog"
          type="text"
          value={draft}
          data-testid="busqueda"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={run}
        />
        <Button type="submit" variant="primary" data-testid="buscar">
          Buscar
        </Button>
      </form>
      <p role="status" aria-live="polite" className="a11y-live">
        {searched ? `${matches.length} artículos encontrados.` : ''}
      </p>
    </search>
  );
}
