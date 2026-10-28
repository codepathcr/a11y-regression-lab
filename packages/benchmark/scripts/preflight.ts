import { checkOllama, loadConfig, ollamaModelNames } from '@a11y-lab/analysis';
import { ignoreBrokenPipe } from './io';

/**
 * Comprobación previa de la capa de modelos.
 *
 *   pnpm --filter @a11y-lab/benchmark preflight
 *
 * Verifica que el servidor responde, que cada modelo está descargado y que su
 * ventana de contexto alcanza para el prompt más grande del benchmark. Es lo
 * primero que hay que correr al cambiar la lista de modelos o la máquina.
 *
 * La ventana de contexto no es una preferencia. Ollama recorta un prompt que no
 * entra en silencio, sin error y sin aviso, y el modelo responde sobre evidencia
 * truncada: un falso negativo indistinguible de un fallo de detección. Por eso
 * esto aborta en lugar de advertir.
 */

ignoreBrokenPipe();

const config = await loadConfig();
const models = ollamaModelNames(config);

console.log(`Modelos declarados: ${config.models.map((model) => model.id).join(', ')}`);
console.log(`Ventana mínima exigida: ${config.minContextTokens} tokens`);
console.log('');

const baseUrl = Object.values(config.providers).find((spec) => spec.kind === 'ollama')?.baseUrl;
if (!baseUrl) {
  console.error('No hay ningún proveedor de Ollama declarado en analysis.config.json.');
  process.exit(1);
}
console.log(`Servidor: ${baseUrl}`);
console.log('');

const result = await checkOllama(baseUrl, models, config.minContextTokens);

if (result.checks.length === 0) {
  console.error(`No se pudo consultar el servidor: ${result.detail}`);
  console.error('');
  console.error('Si Ollama corre en el anfitrión y esto corre en el contenedor, el servidor es');
  console.error('host.docker.internal. Si corre en otra máquina, exportá A11Y_OLLAMA_URL.');
  process.exit(1);
}

for (const check of result.checks) {
  console.log(`  ${check.ok ? 'OK  ' : 'NO  '} ${check.model.padEnd(20)} ${check.detail}`);
}

// Cuando falta algo, lo primero que hace falta saber es qué SÍ hay: puede que un
// modelo ya descargado sirva y no haya nada que bajar.
if (!result.ok) {
  console.log('');
  if (result.available.length === 0) {
    console.log('El servidor no tiene ningún modelo descargado.');
  } else {
    console.log(`Modelos que el servidor ya tiene (${result.available.length}):`);
    for (const model of [...result.available].sort()) console.log(`  · ${model}`);
    console.log('');
    console.log('Si alguno de estos sirve, cambiá la lista en packages/analysis/analysis.config.json');
    console.log('y volvé a correr esto: valida la ventana de contexto de lo que pongas.');
  }
}

console.log('');
console.log(result.detail);
if (!result.ok) {
  console.log('');
  console.log('Los pull van en la máquina donde corre Ollama, no en este contenedor.');
}
process.exit(result.ok ? 0 : 1);
