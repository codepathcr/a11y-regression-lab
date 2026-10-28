import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { launchChromium } from './browser';
import { ignoreBrokenPipe } from './io';
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
 * Requiere `pnpm build` previo.
 */

ignoreBrokenPipe();

const PORT = 5399;

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
    console.log(`  FALLA ${app} · ${variant}`);
    console.log(`          ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.close();
  }
}

await browser.close();
server.close();

console.log('');
console.log(failures === 0 ? 'Todas las variantes limpias.' : `${failures} variante(s) con hallazgos.`);
process.exit(failures === 0 ? 0 : 1);
