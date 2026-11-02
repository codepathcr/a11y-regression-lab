import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { buildProviderFromEnv } from '../src/providers/from-env';
import { parseVerdict } from '../src/parse';

/**
 * Comprobación de los proveedores de API y de la configuración por entorno.
 *
 * Corre sin red externa y sin claves reales: levanta servidores locales que
 * imitan las respuestas de Ollama, de la API de Chat Completions y de la de
 * Mensajes de Anthropic, y verifica el formato de la petición, la lectura de la
 * respuesta, el reintento y que la clave nunca aparezca en un mensaje de error.
 *
 *   pnpm --filter @a11y-lab/analysis check:providers
 */

const VEREDICTO = JSON.stringify({
  regression: true,
  category: 'operación mediante teclado',
  transitionStep: 5,
  evidence: 'Falta el evento de foco.',
});
const CLAVE = 'sk-prueba-1234567890abcdef';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  OK  ' : ' FALLA'}  ${name}${ok || detail === '' ? '' : `  (${detail})`}`);
  if (!ok) failures += 1;
}

interface Seen {
  url: string;
  headers: IncomingMessage['headers'];
  body: Record<string, unknown>;
}

async function withServer<T>(
  handler: (req: IncomingMessage, res: ServerResponse, seen: Seen, count: number) => void,
  body: (baseUrl: string, seen: Seen[]) => Promise<T>
): Promise<T> {
  const seen: Seen[] = [];
  let count = 0;
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += String(chunk)));
    req.on('end', () => {
      const entry: Seen = {
        url: req.url ?? '',
        headers: req.headers,
        body: raw === '' ? {} : (JSON.parse(raw) as Record<string, unknown>),
      };
      seen.push(entry);
      count += 1;
      handler(req, res, entry, count);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await body(`http://127.0.0.1:${port}`, seen);
  } finally {
    server.close();
  }
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

const prompt = { system: 'sistema', user: 'usuario' };

// --- Configuración por entorno ----------------------------------------------

check('sin A11Y_LLM_PROVIDER devuelve null (comportamiento de siempre)', buildProviderFromEnv({}) === null);
check('variable vacía cuenta como no definida', buildProviderFromEnv({ A11Y_LLM_PROVIDER: '' }) === null);

function throws(env: Record<string, string>, fragment: string): boolean {
  try {
    buildProviderFromEnv(env);
    return false;
  } catch (error) {
    return error instanceof Error && error.message.includes(fragment);
  }
}
check('proveedor desconocido falla con mensaje claro', throws({ A11Y_LLM_PROVIDER: 'x', A11Y_LLM_MODEL: 'm' }, 'no es válido'));
check('falta el modelo', throws({ A11Y_LLM_PROVIDER: 'ollama' }, 'A11Y_LLM_MODEL'));
check('anthropic sin clave', throws({ A11Y_LLM_PROVIDER: 'anthropic', A11Y_LLM_MODEL: 'm' }, 'A11Y_LLM_API_KEY'));
check('openai sin clave ni URL', throws({ A11Y_LLM_PROVIDER: 'openai', A11Y_LLM_MODEL: 'm' }, 'A11Y_LLM_API_KEY'));
check('temperatura inválida', throws({ A11Y_LLM_PROVIDER: 'openai', A11Y_LLM_MODEL: 'm', A11Y_LLM_API_KEY: CLAVE, A11Y_LLM_TEMPERATURE: 'abc' }, 'A11Y_LLM_TEMPERATURE'));

// --- API compatible con OpenAI ----------------------------------------------

await withServer(
  (_req, res, seen) => {
    void seen;
    json(res, 200, {
      choices: [{ message: { content: VEREDICTO }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 120, completion_tokens: 30 },
    });
  },
  async (baseUrl, seen) => {
    const provider = buildProviderFromEnv({
      A11Y_LLM_PROVIDER: 'openai-compatible',
      A11Y_LLM_MODEL: 'modelo-x',
      A11Y_LLM_API_KEY: CLAVE,
      A11Y_LLM_BASE_URL: `${baseUrl}/v1/`,
      A11Y_LLM_JSON_MODE: 'true',
    });
    const result = await provider!.complete(prompt);
    const request = seen[0]!;
    check('openai: ruta /v1/chat/completions', request.url === '/v1/chat/completions', request.url);
    check('openai: cabecera Bearer', request.headers.authorization === `Bearer ${CLAVE}`);
    check('openai: system y user separados', JSON.stringify(request.body.messages) === JSON.stringify([
      { role: 'system', content: 'sistema' }, { role: 'user', content: 'usuario' }]));
    check('openai: temperatura 0 y max_tokens', request.body.temperature === 0 && request.body.max_tokens === 2048);
    check('openai: json_object activado', JSON.stringify(request.body.response_format) === '{"type":"json_object"}');
    check('openai: texto y tokens', result.text === VEREDICTO && result.promptTokens === 120 && result.completionTokens === 30);
    check('openai: la respuesta se interpreta con el parser del estudio', parseVerdict(result.text).verdict?.transitionStep === 5);
    check('openai: es de pago (metered)', provider!.metered === true);
  }
);

await withServer(
  (_req, res, _seen, count) => {
    if (count < 3) json(res, 503, { error: 'ocupado' });
    else json(res, 200, { choices: [{ message: { content: VEREDICTO }, finish_reason: 'stop' }] });
  },
  async (baseUrl, seen) => {
    const provider = buildProviderFromEnv({
      A11Y_LLM_PROVIDER: 'openai', A11Y_LLM_MODEL: 'm', A11Y_LLM_BASE_URL: baseUrl,
    });
    const result = await provider!.complete(prompt);
    check('openai: reintenta 503 y termina bien al tercer intento', result.text === VEREDICTO && seen.length === 3, `${seen.length} intentos`);
    check('openai: servidor sin clave no envía Authorization', seen[0]!.headers.authorization === undefined);
  }
);

await withServer(
  (_req, res) => json(res, 401, { error: { message: `clave inválida ${CLAVE}` } }),
  async (baseUrl, seen) => {
    const provider = buildProviderFromEnv({
      A11Y_LLM_PROVIDER: 'openai', A11Y_LLM_MODEL: 'm', A11Y_LLM_API_KEY: CLAVE, A11Y_LLM_BASE_URL: baseUrl,
    });
    let message = '';
    try {
      await provider!.complete(prompt);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    check('openai: 401 no se reintenta', seen.length === 1, `${seen.length} intentos`);
    check('openai: el error menciona el código 401', message.includes('401'), message);
    check('openai: la clave NO aparece en el error', !message.includes(CLAVE), message);
  }
);

await withServer(
  (_req, res) => json(res, 200, { choices: [{ message: { content: '{"regres' }, finish_reason: 'length' }] }),
  async (baseUrl) => {
    const provider = buildProviderFromEnv({
      A11Y_LLM_PROVIDER: 'openai', A11Y_LLM_MODEL: 'm', A11Y_LLM_BASE_URL: baseUrl,
    });
    let message = '';
    try { await provider!.complete(prompt); } catch (error) { message = error instanceof Error ? error.message : String(error); }
    check('openai: respuesta cortada por longitud se reporta como tal', message.includes('longitud'), message);
  }
);

// --- Anthropic ---------------------------------------------------------------

await withServer(
  (_req, res) =>
    json(res, 200, {
      content: [{ type: 'text', text: VEREDICTO }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 200, output_tokens: 40 },
    }),
  async (baseUrl, seen) => {
    const provider = buildProviderFromEnv({
      A11Y_LLM_PROVIDER: 'anthropic', A11Y_LLM_MODEL: 'claude-x', A11Y_LLM_API_KEY: CLAVE, A11Y_LLM_BASE_URL: baseUrl,
    });
    const result = await provider!.complete(prompt);
    const request = seen[0]!;
    check('anthropic: ruta /v1/messages', request.url === '/v1/messages', request.url);
    check('anthropic: cabeceras x-api-key y anthropic-version',
      request.headers['x-api-key'] === CLAVE && request.headers['anthropic-version'] === '2023-06-01');
    check('anthropic: system aparte y un solo mensaje de usuario',
      request.body.system === 'sistema' && JSON.stringify(request.body.messages) === JSON.stringify([{ role: 'user', content: 'usuario' }]));
    check('anthropic: max_tokens y temperatura 0', request.body.max_tokens === 2048 && request.body.temperature === 0);
    check('anthropic: texto y tokens', result.text === VEREDICTO && result.promptTokens === 200 && result.completionTokens === 40);
  }
);

await withServer(
  (_req, res) => json(res, 200, { content: [{ type: 'text', text: VEREDICTO }], stop_reason: 'end_turn' }),
  async (baseUrl, seen) => {
    const provider = buildProviderFromEnv({
      A11Y_LLM_PROVIDER: 'anthropic', A11Y_LLM_MODEL: 'm', A11Y_LLM_API_KEY: CLAVE,
      A11Y_LLM_BASE_URL: baseUrl, A11Y_LLM_TEMPERATURE: 'omit',
    });
    await provider!.complete(prompt);
    check('anthropic: temperatura "omit" no envía el campo', !('temperature' in seen[0]!.body));
  }
);

// --- Ollama por entorno --------------------------------------------------------

await withServer(
  (_req, res) => json(res, 200, { response: VEREDICTO, prompt_eval_count: 90, eval_count: 25, done_reason: 'stop' }),
  async (baseUrl, seen) => {
    const provider = buildProviderFromEnv({
      A11Y_LLM_PROVIDER: 'ollama', A11Y_LLM_MODEL: 'llama3.1:8b', A11Y_LLM_BASE_URL: baseUrl,
    });
    const result = await provider!.complete(prompt);
    const options = seen[0]!.body.options as Record<string, unknown>;
    check('ollama: ruta /api/generate con model y sin streaming',
      seen[0]!.url === '/api/generate' && seen[0]!.body.model === 'llama3.1:8b' && seen[0]!.body.stream === false);
    check('ollama: parámetros del estudio (temperatura 0, semilla 7, ventana 26624)',
      options.temperature === 0 && options.seed === 7 && options.num_ctx === 26624);
    check('ollama: texto y tokens', result.text === VEREDICTO && result.promptTokens === 90 && result.completionTokens === 25);
    check('ollama: no es de pago', provider!.metered === false);
  }
);

console.log('');
if (failures > 0) {
  console.error(`${failures} comprobación(es) fallaron.`);
  process.exit(1);
}
console.log('Todas las comprobaciones pasaron.');
