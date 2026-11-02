import type { Provider } from '../types';
import { AnthropicProvider } from './anthropic';
import { OllamaProvider } from './ollama';
import { OpenAICompatibleProvider } from './openai';

/**
 * Construye un proveedor a partir de variables de entorno.
 *
 * Es la vía opcional para el flujo de Pull Requests y para quien usa el
 * framework en otro repositorio: el modelo se elige con variables y secretos del
 * entorno, sin tocar ningún archivo versionado. NO participa de las mediciones
 * del estudio, que siguen leyendo `analysis.config.json`; si `A11Y_LLM_PROVIDER`
 * no está definida, esta función devuelve `null` y todo se comporta como antes.
 *
 * Variables:
 *
 *   A11Y_LLM_PROVIDER     ollama | openai | anthropic     (obligatoria para activar)
 *   A11Y_LLM_MODEL        nombre del modelo               (obligatoria)
 *   A11Y_LLM_API_KEY      clave de la API                 (openai y anthropic)
 *   A11Y_LLM_BASE_URL     raíz de la API                  (opcional; ver valores por omisión)
 *   A11Y_LLM_ID           identificador en los reportes   (por omisión, el modelo)
 *   A11Y_LLM_LABEL        nombre legible                  (por omisión, el modelo)
 *   A11Y_LLM_TIMEOUT_MS   tope por consulta               (por omisión 120000)
 *   A11Y_LLM_MAX_TOKENS   tope de la respuesta            (por omisión 2048)
 *   A11Y_LLM_TEMPERATURE  número, o "omit" para no enviarla (por omisión 0)
 *   A11Y_LLM_JSON_MODE    true | false, solo openai       (por omisión false)
 *   A11Y_LLM_NUM_CTX      ventana de contexto, solo ollama (por omisión 26624)
 *
 * "openai" significa "API con formato Chat Completions de OpenAI": sirve para
 * OpenAI, Azure, Groq, Together, OpenRouter, vLLM, LM Studio y similares.
 * También se acepta el alias "openai-compatible".
 */

type Env = Record<string, string | undefined>;

/** GitHub Actions entrega las variables sin definir como cadena vacía. */
function read(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === undefined || value === '' ? undefined : value;
}

function readNumber(env: Env, name: string, fallback: number): number {
  const raw = read(env, name);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} debe ser un número positivo, y vale "${raw}".`);
  }
  return value;
}

function readTemperature(env: Env): number | null {
  const raw = read(env, 'A11Y_LLM_TEMPERATURE');
  if (raw === undefined) return 0;
  if (raw.toLowerCase() === 'omit') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`A11Y_LLM_TEMPERATURE debe ser un número no negativo o "omit", y vale "${raw}".`);
  }
  return value;
}

function stripSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const PROVIDER_ENV_NAMES = [
  'A11Y_LLM_PROVIDER',
  'A11Y_LLM_MODEL',
  'A11Y_LLM_API_KEY',
  'A11Y_LLM_BASE_URL',
  'A11Y_LLM_ID',
  'A11Y_LLM_LABEL',
  'A11Y_LLM_TIMEOUT_MS',
  'A11Y_LLM_MAX_TOKENS',
  'A11Y_LLM_TEMPERATURE',
  'A11Y_LLM_JSON_MODE',
  'A11Y_LLM_NUM_CTX',
] as const;

export function buildProviderFromEnv(env: Env = process.env): Provider | null {
  const kindRaw = read(env, 'A11Y_LLM_PROVIDER');
  if (kindRaw === undefined) return null;

  const kind = kindRaw.toLowerCase() === 'openai-compatible' ? 'openai' : kindRaw.toLowerCase();
  if (kind !== 'ollama' && kind !== 'openai' && kind !== 'anthropic') {
    throw new Error(
      `A11Y_LLM_PROVIDER="${kindRaw}" no es válido. Valores aceptados: ollama, openai, anthropic.`
    );
  }

  const model = read(env, 'A11Y_LLM_MODEL');
  if (model === undefined) {
    throw new Error('A11Y_LLM_PROVIDER está definida pero falta A11Y_LLM_MODEL.');
  }

  const id = read(env, 'A11Y_LLM_ID') ?? model;
  const label = read(env, 'A11Y_LLM_LABEL') ?? model;
  const requestTimeoutMs = readNumber(env, 'A11Y_LLM_TIMEOUT_MS', 120_000);
  const apiKey = read(env, 'A11Y_LLM_API_KEY');
  const baseUrlRaw = read(env, 'A11Y_LLM_BASE_URL');

  if (kind === 'ollama') {
    return new OllamaProvider({
      id,
      label,
      model,
      baseUrl: stripSlash(baseUrlRaw ?? 'http://127.0.0.1:11434'),
      requestTimeoutMs,
      keepAlive: '10m',
      // Los mismos valores del estudio: determinista y con la ventana que el
      // benchmark exige. Solo la ventana se puede cambiar.
      options: {
        temperature: 0,
        seed: 7,
        num_ctx: readNumber(env, 'A11Y_LLM_NUM_CTX', 26_624),
        num_predict: readNumber(env, 'A11Y_LLM_MAX_TOKENS', 2048),
      },
    });
  }

  if (kind === 'anthropic') {
    if (apiKey === undefined) {
      throw new Error('El proveedor anthropic necesita A11Y_LLM_API_KEY.');
    }
    return new AnthropicProvider({
      id,
      label,
      model,
      baseUrl: stripSlash(baseUrlRaw ?? 'https://api.anthropic.com'),
      apiKey,
      requestTimeoutMs,
      maxTokens: readNumber(env, 'A11Y_LLM_MAX_TOKENS', 2048),
      temperature: readTemperature(env),
    });
  }

  // openai: la clave es obligatoria salvo que se apunte a un servidor propio.
  if (apiKey === undefined && baseUrlRaw === undefined) {
    throw new Error(
      'El proveedor openai necesita A11Y_LLM_API_KEY (o A11Y_LLM_BASE_URL si es un servidor sin clave).'
    );
  }
  const baseUrl = stripSlash(baseUrlRaw ?? 'https://api.openai.com/v1');
  const isOfficialOpenAI = new URL(baseUrl).hostname === 'api.openai.com';
  return new OpenAICompatibleProvider({
    id,
    label,
    model,
    baseUrl,
    apiKey,
    requestTimeoutMs,
    maxTokens: readNumber(env, 'A11Y_LLM_MAX_TOKENS', 2048),
    temperature: readTemperature(env),
    jsonMode: read(env, 'A11Y_LLM_JSON_MODE')?.toLowerCase() === 'true',
    tokenParam: isOfficialOpenAI ? 'max_completion_tokens' : 'max_tokens',
  });
}
