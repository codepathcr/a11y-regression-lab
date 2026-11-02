import type { Completion, CompletionResult, Provider } from '../types';
import { postJson } from './http';

export interface OpenAICompatibleConfig {
  id: string;
  label: string;
  /** Nombre del modelo tal como lo espera la API. */
  model: string;
  /** Raíz de la API, por ejemplo https://api.openai.com/v1. Sin barra final. */
  baseUrl: string;
  /** Puede faltar en servidores locales que no la piden (LM Studio, vLLM). */
  apiKey?: string;
  requestTimeoutMs: number;
  /** Tope de tokens de la respuesta. */
  maxTokens: number;
  /** `null` omite el campo, para modelos que solo aceptan su valor por omisión. */
  temperature: number | null;
  /** Activa `response_format: json_object`. No todos los servidores compatibles
   *  lo aceptan, por eso es opcional. El prompt ya exige JSON de todas formas. */
  jsonMode?: boolean;
  /** OpenAI exige `max_completion_tokens` en sus modelos recientes; la mayoría
   *  de los servidores compatibles todavía usa `max_tokens`. */
  tokenParam?: 'max_tokens' | 'max_completion_tokens';
}

interface ChatResponse {
  choices?: Array<{
    message?: { content?: string | null; refusal?: string | null };
    finish_reason?: string | null;
  }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Proveedor para cualquier API con el formato de Chat Completions de OpenAI.
 *
 * Cubre OpenAI, Azure OpenAI, Groq, Together, Mistral, OpenRouter, DeepSeek, y
 * servidores propios como vLLM, LM Studio o el endpoint `/v1` de Ollama. Basta
 * cambiar `baseUrl`, `model` y la clave.
 *
 * No es el camino de las mediciones del estudio, que usan Ollama con parámetros
 * fijos. Es la vía opcional para el flujo de Pull Requests.
 */
export class OpenAICompatibleProvider implements Provider {
  readonly kind = 'openai';
  readonly metered = true;

  constructor(private readonly config: OpenAICompatibleConfig) {}

  get id(): string {
    return this.config.id;
  }

  get label(): string {
    return this.config.label;
  }

  async complete(completion: Completion): Promise<CompletionResult> {
    const started = performance.now();
    const { config } = this;

    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        { role: 'system', content: completion.system },
        { role: 'user', content: completion.user },
      ],
      [config.tokenParam ?? 'max_tokens']: config.maxTokens,
    };
    if (config.temperature !== null) body.temperature = config.temperature;
    if (config.jsonMode === true) body.response_format = { type: 'json_object' };

    const payload = (await postJson({
      url: `${config.baseUrl}/chat/completions`,
      headers: config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {},
      body,
      timeoutMs: config.requestTimeoutMs,
      label: `La API del modelo ${config.model}`,
      secrets: config.apiKey ? [config.apiKey] : [],
    })) as ChatResponse;

    const choice = payload.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== 'string' || text === '') {
      const refusal = choice?.message?.refusal ? ` Rechazo: ${choice.message.refusal}` : '';
      throw new Error(`La API del modelo ${config.model} no devolvió texto.${refusal}`);
    }
    if (choice?.finish_reason === 'length') {
      throw new Error(
        `La respuesta de ${config.model} se cortó por longitud. Subí A11Y_LLM_MAX_TOKENS.`
      );
    }

    return {
      text,
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      latencyMs: Math.round(performance.now() - started),
    };
  }
}
