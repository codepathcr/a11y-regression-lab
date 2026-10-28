import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/** Se come Enter y Espacio: el navegador no sintetiza el clic de esas teclas. */
function swallowKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
}

/**
 * MUTACIÓN · eliminación de activación mediante teclado · operador propio ·
 * criterio 2.1.1
 *
 * Los botones "Ver requisitos" siguen tabulables y siguen anunciándose como
 * botones, pero Enter y Espacio dejan de abrir el detalle del trámite.
 *
 * Ver docs/protocolo-mutacion.md para la operacionalización descartada
 * —sustituir `onClick` por `onMouseDown`— y el motivo del descarte.
 *
 * El efecto es que **el portal entero se vuelve inalcanzable por teclado**: sin
 * abrir el detalle no hay forma de llegar a la solicitud. El buscador funciona,
 * la lista aparece, y ahí termina el recorrido.
 *
 * Sexto anfitrión del operador.
 */
export function TramiteSearchKeyboardSwallow() {
  const { results, loading, search, select } = usePortal();
  const [draft, setDraft] = useState('');

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(draft);
  }

  return (
    <section aria-labelledby="buscar-titulo">
      <h2 id="buscar-titulo">Buscar un trámite</h2>
      <form onSubmit={onSubmit} role="search" aria-label="Buscar trámites">
        <TextField
          label="Nombre o área del trámite"
          type="text"
          value={draft}
          data-testid="buscar-campo"
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit" variant="primary" data-testid="buscar">
          Buscar
        </Button>
      </form>

      <div aria-busy={loading} className="portal__resultados">
        {loading ? (
          <p>Consultando el catálogo…</p>
        ) : (
          <ul className="portal__lista">
            {results.map((tramite) => (
              <li key={tramite.id}>
                <article>
                  <h3>{tramite.name}</h3>
                  <p className="portal__meta">
                    {tramite.area} · {tramite.days} · {tramite.cost}
                  </p>
                  <Button
                    aria-label={`Ver requisitos de ${tramite.name}`}
                    data-testid={`ver-${tramite.id}`}
                    onKeyDown={swallowKeyboard}
                    onClick={() => select(tramite)}
                  >
                    Ver requisitos
                  </Button>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
