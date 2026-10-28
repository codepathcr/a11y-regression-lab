import { Disclosure } from '@a11y-lab/ui';

/**
 * DIVERGENCIA BENIGNA · reescritura de texto visible, incluido el rótulo de un
 * control
 *
 * Se reescriben los dos resúmenes plegables y su contenido. El rótulo de un
 * `Disclosure` es el nombre accesible de su botón, de modo que este cambio
 * altera dos nombres accesibles además del texto interior.
 *
 * Interesa que un caso benigno toque nombres accesibles y no solo texto suelto:
 * un detector que marque toda diferencia de nombre accesible como regresión
 * fallaría acá, y es un atajo plausible.
 */
export function PoolRulesReworded() {
  return (
    <section aria-labelledby="reglas-titulo">
      <h2 id="reglas-titulo">Antes de venir</h2>
      <Disclosure summary="¿Qué tengo que llevar?">
        <p>Gorro de baño, toalla y sandalias. El gorro es obligatorio en todos los carriles.</p>
      </Disclosure>
      <Disclosure summary="¿Se puede cancelar la reserva?">
        <p>Sí, hasta dos horas antes del horario reservado y desde esta misma página.</p>
      </Disclosure>
    </section>
  );
}
