import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { captureTrace, diffLines, normalize } from '@a11y-lab/framework';
import type { IdentityMode, Scenario } from '@a11y-lab/framework';
import { launchChromium } from './browser';
import { APPS, serveDist } from './static-server';

/**
 * Herramienta de diagnóstico: imprime la traza de dos variantes paso a paso,
 * marcando qué línea existe solo en una de las dos.
 *
 *   pnpm --filter @a11y-lab/benchmark inspect a01-landing base m02-status-silent
 *
 * Existe porque una divergencia de 0% entre una versión y su mutante admite dos
 * lecturas opuestas —instrumentación incompleta, o defecto genuinamente
 * invisible en la traza— y la diferencia entre ambas no se resuelve mirando
 * porcentajes.
 */

const PORT = 5397;

const appId = process.argv[2] ?? 'a01-landing';
const leftId = process.argv[3] ?? 'base';
const rightId = process.argv[4] ?? 'm02-status-silent';
const identity = (process.argv[5] ?? 'semantic') as IdentityMode;

interface AppFile {
  scenario: Scenario;
}

const app = JSON.parse(await readFile(join(APPS, appId, 'app.json'), 'utf8')) as AppFile;
const scenario: Scenario = { id: appId, steps: app.scenario.steps };

const server = await serveDist(PORT);
const browser = await launchChromium();

try {
  const left = normalize(
    await captureTrace(browser, { url: `${server.origin}/?app=${appId}&variant=${leftId}`, scenario }),
    { identity }
  );
  const right = normalize(
    await captureTrace(browser, { url: `${server.origin}/?app=${appId}&variant=${rightId}`, scenario }),
    { identity }
  );

  console.log(`Identidad: ${identity}`);
  console.log(`  -  solo en ${leftId}`);
  console.log(`  +  solo en ${rightId}`);
  console.log('');

  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    const action = a?.action ?? b?.action ?? '(ausente)';
    const diff = diffLines(a?.events ?? [], b?.events ?? []);
    const axDiff = diffLines(a?.ax ?? [], b?.ax ?? []);

    const mark = diff.added.length + diff.removed.length > 0 ? ' *** DIFIERE' : '';
    console.log(`paso ${index}: ${action}${mark}`);

    for (const line of a?.events ?? []) {
      const only = diff.removed.includes(line);
      console.log(`   ${only ? '-' : ' '} ${line}`);
    }
    for (const line of diff.added) {
      console.log(`   + ${line}`);
    }
    if ((a?.events ?? []).length === 0 && diff.added.length === 0) {
      console.log('     (sin eventos)');
    }
    if (axDiff.added.length + axDiff.removed.length > 0) {
      console.log(`     árbol: ${axDiff.removed.length} nodos solo en ${leftId}, ${axDiff.added.length} solo en ${rightId}`);
      for (const line of axDiff.removed.slice(0, 4)) console.log(`       - ${line.trim()}`);
      for (const line of axDiff.added.slice(0, 4)) console.log(`       + ${line.trim()}`);
    }
    console.log('');
  }
} finally {
  await browser.close();
  server.close();
}
