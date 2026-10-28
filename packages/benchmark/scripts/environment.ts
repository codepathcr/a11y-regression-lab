import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Trace } from '@a11y-lab/framework';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG = join(HERE, '..', 'environment.json');

/** Permiso explícito para correr fuera del entorno de referencia. */
const OVERRIDE = 'A11Y_ALLOW_BROWSER_MISMATCH';

interface EnvironmentConfig {
  expectedBrowserVersion: string | null;
}

/**
 * Informa el entorno de ejecución y aborta si no es el declarado.
 *
 * Existe por un defecto de procedimiento, no de código. La traza ya registraba
 * `environment.browserVersion` desde la fase 3, pero ningún script lo imprimía,
 * de modo que dos ejecuciones del benchmark en contenedores con Chromium
 * distinto —130 y 141— produjeron cifras de árbol distintas sin que nada lo
 * advirtiera. La información estaba capturada y nunca se mostró: un dato que no
 * se imprime no cumple su función.
 *
 * La comprobación es estricta por omisión porque el costo de los dos errores es
 * asimétrico. No obtener cifras cuesta volver a correr el benchmark; publicar
 * cifras que no se pueden comparar con las ya publicadas cuesta el capítulo de
 * resultados.
 *
 * La excepción requiere intención explícita y marca su salida. Vale para
 * construir fixtures o iterar sobre una mutación, donde lo que importa es el
 * signo de la divergencia y no su magnitud; nunca para producir una cifra.
 */
export async function reportEnvironment(trace: Trace): Promise<void> {
  const config = JSON.parse(await readFile(CONFIG, 'utf8')) as EnvironmentConfig;
  const { browser, browserVersion, viewport, settleMs } = trace.environment;

  console.log(
    `Entorno: ${browser} ${browserVersion} · viewport ${viewport.width}x${viewport.height} · settle ${settleMs} ms`
  );

  const expected = config.expectedBrowserVersion;
  if (expected === null) {
    console.log(
      'Entorno de referencia sin fijar. Anotá esta versión en packages/benchmark/environment.json ' +
        'antes de llevar cifras de magnitud al documento.'
    );
    return;
  }

  if (expected === browserVersion) {
    console.log('Entorno de referencia: coincide. Las cifras de magnitud son comparables.');
    return;
  }

  const message =
    `se esperaba Chromium ${expected} y corre ${browserVersion}. La detección, la localización y el ` +
    'piso de ruido son invariantes entre versiones de navegador; la magnitud de la divergencia de ' +
    'árbol no lo es.';

  if (process.env[OVERRIDE] === '1') {
    console.log('');
    console.log(`ENTORNO DISTINTO DEL DECLARADO, continuando por ${OVERRIDE}=1: ${message}`);
    console.log('SALIDA NO CITABLE. Sirve para construir fixtures, no para producir cifras.');
    console.log('');
    return;
  }

  console.error('');
  console.error(`ENTORNO DISTINTO DEL DECLARADO: ${message}`);
  console.error(
    `Corré el benchmark en el contenedor del proyecto, o exportá ${OVERRIDE}=1 si lo que buscás no ` +
      'es una cifra sino el signo de la divergencia.'
  );
  process.exit(1);
}
