import {
  AIProvider,
  AIGenerateOptions,
  AIGenerateResponse,
  AIStreamChunk,
  AIStructuredOptions,
} from '../core/types';

/**
 * OpenAI Provider Implementation
 * Supports OpenAI API and compatible endpoints
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;

  constructor(config: {
    apiKey: string;
    apiUrl?: string;
    defaultModel?: string;
  }) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel || 'gpt-4';
  }

  async generate(
    input: string,
    options?: AIGenerateOptions
  ): Promise<AIGenerateResponse> {
    const model = options?.model || this.defaultModel;
    const messages = this.buildMessages(input, options);

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        top_p: options?.topP,
        stop: options?.stop,
      }),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${
          error.error?.message || 'Unknown error'
        }`
      );
    }

    const data: any = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      model: data.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: choice.finish_reason,
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

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
        top_p: options?.topP,
        stop: options?.stop,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${
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
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices[0]?.delta;
            if (delta?.content) {
              yield { content: delta.content, done: false };
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
    } catch (error: unknown) {
      throw new Error(
        `Failed to parse structured output: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  estimateCost(tokenCount: number, model?: string): number {
    const modelName = model || this.defaultModel;

    // Cost per 1K tokens (approximate pricing as of 2024)
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };

    const cost = costs[modelName] || costs['gpt-3.5-turbo'];
    // Assume 50/50 split between input and output tokens
    const avgCostPer1K = (cost.input + cost.output) / 2;
    return (tokenCount / 1000) * avgCostPer1K;
  }

  private buildMessages(input: string, options?: AIGenerateOptions) {
    const messages: Array<{ role: string; content: string }> = [];

    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    if (options?.context) {
      for (const msg of options.context) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    messages.push({ role: 'user', content: input });
    return messages;
  }
}
