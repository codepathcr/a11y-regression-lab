import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, TextField } from '@a11y-lab/ui';
import type { Tramite } from '../data/tramites';
import { usePortal } from '../store/portal-context';

/**
 * CONTROL NEGATIVO · no introduce ninguna regresión de accesibilidad
 *
 * Este control existe **para poner a prueba una regla de normalización
 * concreta**, y es el único del benchmark diseñado con ese propósito.
 *
 * La línea de metadatos de cada trámite pasa de tres expresiones interpoladas
 * —`{area} · {days} · {cost}`, que React convierte en cinco nodos de texto— a
 * una sola cadena construida en una función auxiliar, es decir un único nodo de
 * texto. El texto resultante es idéntico carácter por carácter, el nombre
 * accesible del párrafo es el mismo y lo que una tecnología asistiva anuncia es
 * exactamente lo mismo.
 *
 * Un control negativo así daba 3,0% de divergencia de árbol antes de que
 * `prepareAx` uniera los nodos de texto contiguos; lo descubrió el control
 * equivalente de `a06-equipo`. Este caso verifica que la regla sigue en pie, y
 * fallaría de inmediato si alguien la retirara.
 */
function describeMeta(tramite: Tramite): string {
  return `${tramite.area} · ${tramite.days} · ${tramite.cost}`;
}

export function TramiteSearchTextJoin() {
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
                  <p className="portal__meta">{describeMeta(tramite)}</p>
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
