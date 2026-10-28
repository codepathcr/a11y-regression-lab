import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import { usePortal } from '../store/portal-context';

/**
 * Buscador y lista de resultados.
 *
 * La búsqueda se dispara al enviar el formulario y no en cada tecla, por el
 * mismo criterio que en a05-blog: filtrar mientras se escribe cambia el
 * contenido sin que la persona lo pida y obliga a anunciar en cada pulsación.
 *
 * El estado de carga se comunica con `aria-busy` y el recuento resultante se
 * anuncia desde la región live de la app.
 */
export function TramiteSearch() {
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
