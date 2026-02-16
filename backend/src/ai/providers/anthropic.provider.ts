import {
  AIProvider,
  AIGenerateOptions,
  AIGenerateResponse,
  AIStreamChunk,
  AIStructuredOptions,
} from '../core/types';

/**
 * Anthropic (Claude) Provider Implementation
 */
export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;

  constructor(config: {
    apiKey: string;
    apiUrl?: string;
    defaultModel?: string;
  }) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.anthropic.com/v1';
    this.defaultModel = config.defaultModel || 'claude-3-sonnet-20240229';
  }

  async generate(
    input: string,
    options?: AIGenerateOptions
  ): Promise<AIGenerateResponse> {
    const model = options?.model || this.defaultModel;
    const messages = this.buildMessages(input, options);

    const response = await fetch(`${this.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages,
        system: options?.systemPrompt,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        top_p: options?.topP,
        stop_sequences: options?.stop,
      }),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({}));
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText} - ${
          error.error?.message || 'Unknown error'
        }`
      );
    }

    const data: any = await response.json();

    return {
      content: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason,
      metadata: {
        raw: data,
      },
    };
  }

  async *stream(
    input: string,
    options?: AIGenerateOptions
  ): AsyncIterable<AIStreamChunk> {
    const model = options?.model || this.defaultModel;
    const messages = this.buildMessages(input, options);

    const response = await fetch(`${this.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages,
        system: options?.systemPrompt,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        top_p: options?.topP,
        stop_sequences: options?.stop,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({}));
      throw new Error(
        `Anthropic API error: ${response.status} ${response.statusText} - ${
          error.error?.message || 'Unknown error'
        }`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const parsed = JSON.parse(data);
            
            if (parsed.type === 'content_block_delta') {
              const delta = parsed.delta;
              if (delta?.text) {
                yield { content: delta.text, done: false };
              }
            } else if (parsed.type === 'message_stop') {
              yield { content: '', done: true };
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    yield { content: '', done: true };
  }

  async generateStructured(
    schema: Record<string, any>,
    input: string,
    options?: AIStructuredOptions
  ): Promise<any> {
    const prompt = `${input}\n\nPlease respond with a JSON object that matches this schema:\n${JSON.stringify(
      schema,
      null,
      2
    )}`;

    const response = await this.generate(prompt, {
      ...options,
      temperature: 0.3, // Lower temperature for structured output
    });

    try {
      // Extract JSON from response (handle markdown code blocks)
      let content = response.content.trim();
      if (content.startsWith('```json')) {
        content = content.slice(7);
      }
      if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }

      const parsed = JSON.parse(content.trim());
      return parsed;
    } catch (error) {
      throw new Error(
        `Failed to parse structured output: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  estimateCost(tokenCount: number, model?: string): number {
    const modelName = model || this.defaultModel;

    // Cost per 1M tokens (pricing subject to change - verify with Anthropic)
    const costs: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    };

    const cost = costs[modelName] || costs['claude-3-sonnet-20240229'];
    // Assume 50/50 split between input and output tokens
    const avgCostPer1M = (cost.input + cost.output) / 2;
    return (tokenCount / 1000000) * avgCostPer1M;
  }

  private buildMessages(input: string, options?: AIGenerateOptions) {
    const messages: Array<{ role: string; content: string }> = [];

    if (options?.context) {
      for (const msg of options.context) {
        if (msg.role !== 'system') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: 'user', content: input });
    return messages;
  }
}
