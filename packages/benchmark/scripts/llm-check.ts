import { SYSTEM_PROMPT, buildProviderFromEnv, parseVerdict } from '@a11y-lab/analysis';
import { ignoreBrokenPipe } from './io';

/**
 * Comprueba que el modelo configurado por variables de entorno responde.
 *
 * Es la prueba que conviene correr ANTES de abrir un Pull Request: confirma que
 * la URL, la clave y el nombre del modelo son correctos, y que la respuesta
 * cumple el contrato de salida del estudio. Hace una sola consulta pequeña.
 *
 *   A11Y_LLM_PROVIDER=openai A11Y_LLM_MODEL=gpt-4o-mini A11Y_LLM_API_KEY=... \
 *     pnpm --filter @a11y-lab/benchmark llm-check
 *
 * Sale con 0 si el modelo respondió con un veredicto legible, y con 1 en
 * cualquier otro caso. No imprime nunca la clave.
 */

ignoreBrokenPipe();

let provider;
try {
  provider = buildProviderFromEnv();
} catch (error) {
  console.error(`Configuración inválida: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

if (provider === null) {
  console.error('No hay modelo configurado. Define A11Y_LLM_PROVIDER y A11Y_LLM_MODEL (ver docs/github-actions.md).');
  process.exit(1);
}

console.log(`Proveedor: ${provider.kind} · modelo: ${provider.label}`);

// Evidencia mínima y sintética: un paso donde el foco desaparece en la versión
// modificada. No es una medición; solo ejercita la ruta de red y el formato.
const user = [
  'Aplicación: comprobación de conexión',
  '',
  'Se te entregan las DIFERENCIAS entre una versión base y una versión modificada, en cada paso',
  'de un mismo recorrido. Las líneas con "- base" existen solo en la base; las líneas con',
  '"+ modificada" existen solo en la modificada.',
  '',
  '---',
  '',
  '## paso 2 — press tecla Enter',
  '',
  'diferencias de eventos observados:',
  '  - base      focus button "Abrir menú"',
  '  - base      aria-change button "Abrir menú" aria-expanded false -> true',
  '',
  'Determiná si el cambio introdujo una regresión de accesibilidad de las cuatro categorías.',
].join('\n');

try {
  const result = await provider.complete({ system: SYSTEM_PROMPT, user });
  const parsed = parseVerdict(result.text);
  console.log(`Respuesta en ${result.latencyMs} ms · ${result.promptTokens} tokens de entrada · ${result.completionTokens} de salida`);
  if (parsed.verdict === null) {
    console.error(`El modelo respondió, pero no con un veredicto legible: ${parsed.issues.join('; ')}`);
    console.error(`Respuesta cruda (primeros 300 caracteres): ${result.text.slice(0, 300)}`);
    process.exit(1);
  }
  console.log(`Veredicto: regression=${parsed.verdict.regression} · categoría=${parsed.verdict.category ?? 'ninguna'} · paso=${parsed.verdict.transitionStep ?? 'ninguno'}`);
  if (parsed.issues.length > 0) console.log(`Incidencias de forma (no bloquean): ${parsed.issues.join('; ')}`);
  console.log('La conexión funciona.');
} catch (error) {
  console.error(`La consulta falló: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
