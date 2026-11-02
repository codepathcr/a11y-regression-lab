import type { Completion, CompletionResult, Provider } from '../types';
import { postJson } from './http';

export interface AnthropicConfig {
  id: string;
  label: string;
  model: string;
  /** Raíz de la API, sin barra final. Por omisión https://api.anthropic.com. */
  baseUrl: string;
  apiKey: string;
  requestTimeoutMs: number;
  maxTokens: number;
  /** `null` omite el campo, para modelos que no aceptan configurarlo. */
  temperature: number | null;
}

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
  stop_reason?: string | null;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Proveedor para la API de Mensajes de Anthropic (Claude). */
export class AnthropicProvider implements Provider {
  readonly kind = 'anthropic';
  readonly metered = true;

  constructor(private readonly config: AnthropicConfig) {}

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
      max_tokens: config.maxTokens,
      system: completion.system,
      messages: [{ role: 'user', content: completion.user }],
    };
    if (config.temperature !== null) body.temperature = config.temperature;

    const payload = (await postJson({
      url: `${config.baseUrl}/v1/messages`,
      headers: { 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
      body,
      timeoutMs: config.requestTimeoutMs,
      label: `La API del modelo ${config.model}`,
      secrets: [config.apiKey],
    })) as MessagesResponse;

    const text = (payload.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text as string)
      .join('');
    if (text === '') {
      throw new Error(`La API del modelo ${config.model} no devolvió texto.`);
    }
    if (payload.stop_reason === 'max_tokens') {
      throw new Error(
        `La respuesta de ${config.model} se cortó por longitud. Subí A11Y_LLM_MAX_TOKENS.`
      );
    }

    return {
      text,
      promptTokens: payload.usage?.input_tokens ?? 0,
      completionTokens: payload.usage?.output_tokens ?? 0,
      latencyMs: Math.round(performance.now() - started),
    };
  }
}
