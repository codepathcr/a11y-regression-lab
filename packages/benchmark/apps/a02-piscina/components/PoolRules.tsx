import { Disclosure } from '@a11y-lab/ui';

/** Reglas de uso, plegables. */
export function PoolRules() {
  return (
    <section aria-labelledby="reglas-titulo">
      <h2 id="reglas-titulo">Antes de venir</h2>
      <Disclosure summary="¿Qué necesito traer?">
        <p>Gorro de baño, toalla y sandalias. El gorro es obligatorio en todos los carriles.</p>
      </Disclosure>
      <Disclosure summary="¿Puedo cancelar?">
        <p>Sí, hasta dos horas antes del horario reservado y desde esta misma página.</p>
      </Disclosure>
    </section>
  );
}
