import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { launchChromium } from './browser';
import { ignoreBrokenPipe } from './io';
import { BASELINE } from './paths';
import { APPS, serveDist } from './static-server';

/**
 * Chequeo de accesibilidad estática sobre cada variante construida.
 *
 * Verifica DOS cosas a la vez, y la segunda es la importante:
 *
 *  1. Que la versión base de cada app esté limpia. Es requisito de
 *     construcción: no se puede medir una regresión contra una referencia rota.
 *
 *  2. Que las variantes MUTANTES también estén limpias. Esto no es un descuido:
 *     es la premisa del estudio. Si axe-core encontrara el defecto, el caso no
 *     serviría, porque un validador estático ya lo resolvería sin necesidad de
 *     trazas ni modelos. Un hallazgo de axe en un mutante es señal de que la
 *     mutación está mal diseñada.
 *
 * Deja su resultado en `data/baseline/axe.json`, y no solo en la consola. La
 * razon es que el OE5 compromete una comparacion contra un validador estatico, y
 * esa comparacion necesita una cifra citable desde el analisis en lugar de una
 * afirmacion de memoria. La cifra es cero deteccion sobre los pares positivos, y
 * es cero POR CONSTRUCCION: el criterio de admision 2 del protocolo exige que la
 * variante mutante pase el validador sin hallazgos. Que sea cero por diseno no la
 * vuelve prescindible, la vuelve una premisa que hay que verificar.
 *
 * Requiere `pnpm build` previo.
 */

ignoreBrokenPipe();

const PORT = 5399;

/** Una aplicación del benchmark se reconoce por su identificador. `_gallery` es
 *  la vitrina de componentes: conviene comprobarla, pero no cuenta para ninguna
 *  cifra del estudio. */
const BENCHMARK_APP = /^a\d\d-/;

async function listVariants(): Promise<Array<{ app: string; variant: string }>> {
  const out: Array<{ app: string; variant: string }> = [];
  for (const app of (await readdir(APPS, { withFileTypes: true })).filter((e) => e.isDirectory())) {
    const dir = join(APPS, app.name, 'variants');
    const files = await readdir(dir).catch(() => []);
    for (const file of files.filter((f) => f.endsWith('.tsx'))) {
      out.push({ app: app.name, variant: file.replace('.tsx', '') });
    }
  }
  return out.sort((a, b) => `${a.app}${a.variant}`.localeCompare(`${b.app}${b.variant}`));
}

interface AxeViolation {
  id: string;
  impact: string | null;
  help: string;
  nodes: Array<{ target: string[] }>;
}

const server = await serveDist(PORT);
const browser = await launchChromium();
const axePath = resolve(
  import.meta.dirname,
  '..',
  'node_modules',
  'axe-core',
  'axe.min.js',
);

let failures = 0;
interface VariantResult {
  app: string;
  variant: string;
  /** Falso para la vitrina de componentes, que no entra en las cifras del estudio. */
  benchmark: boolean;
  clean: boolean;
  violations: Array<{ id: string; impact: string | null; help: string; targets: string[] }>;
  consoleErrors: string[];
  error?: string;
}
const results: VariantResult[] = [];

for (const { app, variant } of await listVariants()) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const url = `${server.origin}/?app=${app}&variant=${variant}`;

  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('html[data-harness-ready="true"]', { timeout: 10_000 });

    const mounted = await page.locator('[data-harness="mounted"], main').count();
    if (mounted === 0) throw new Error('la variante no montó ningún contenido');

    await page.addScriptTag({ path: axePath });
    const violations = (await page.evaluate(async () => {
      // @ts-expect-error axe se inyecta en tiempo de ejecución
      const result = await window.axe.run(document, { resultTypes: ['violations'] });
      return result.violations;
    })) as AxeViolation[];

    const label = `${app} · ${variant}`;
    results.push({
      app,
      variant,
      benchmark: BENCHMARK_APP.test(app),
      clean: violations.length === 0 && consoleErrors.length === 0,
      violations: violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.map((node) => node.target.join(' ')),
      })),
      consoleErrors,
    });
    if (violations.length === 0 && consoleErrors.length === 0) {
      console.log(`  OK    ${label}`);
    } else {
      failures += 1;
      console.log(`  FALLA ${label}`);
      for (const violation of violations) {
        console.log(`          axe [${violation.impact ?? 'sin impacto'}] ${violation.id}: ${violation.help}`);
        for (const node of violation.nodes.slice(0, 3)) {
          console.log(`            -> ${node.target.join(' ')}`);
        }
      }
      for (const error of consoleErrors.slice(0, 3)) {
        console.log(`          consola: ${error}`);
      }
    }
  } catch (error) {
    failures += 1;
    const detail = error instanceof Error ? error.message : String(error);
    results.push({
      app,
      variant,
      benchmark: BENCHMARK_APP.test(app),
      clean: false,
      violations: [],
      consoleErrors: [],
      error: detail,
    });
    console.log(`  FALLA ${app} · ${variant}`);
    console.log(`          ${detail}`);
  } finally {
    await context.close();
  }
}

await browser.close();
server.close();

await mkdir(BASELINE, { recursive: true });
const bench = results.filter((result) => result.benchmark);
const clean = results.filter((result) => result.clean).length;
const benchClean = bench.filter((result) => result.clean).length;
await writeFile(
  join(BASELINE, 'axe.json'),
  `${JSON.stringify(
    {
      tool: 'axe-core',
      at: new Date().toISOString(),
      summary: {
        // Las cifras del estudio son las del benchmark. El total incluye además
        // la vitrina de componentes, que se comprueba pero no se cita.
        benchmarkVariants: bench.length,
        benchmarkClean: benchClean,
        benchmarkWithFindings: bench.length - benchClean,
        variants: results.length,
        clean,
        withFindings: results.length - clean,
      },
      nota:
        'Deteccion sobre los pares positivos: cero por construccion. El criterio de ' +
        'admision 2 del protocolo de mutacion exige que la variante mutante pase el ' +
        'validador sin hallazgos, de modo que un hallazgo aqui significa que la mutacion ' +
        'esta mal disenada y no que el validador detecto la regresion.',
      results,
    },
    null,
    2
  )}\n`,
  'utf8'
);
console.log('');
console.log(`Linea base escrita en ${join(BASELINE, 'axe.json')}`);
console.log('');
console.log(failures === 0 ? 'Todas las variantes limpias.' : `${failures} variante(s) con hallazgos.`);
process.exit(failures === 0 ? 0 : 1);
