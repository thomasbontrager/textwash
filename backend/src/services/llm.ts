import { LLMService, LLMSuggestParams } from '../types';

export class LLMServiceImpl implements LLMService {
  private apiKey: string;
  private apiUrl: string;
  private model: string;
  private maxTokens: number;
  private timeout: number;
  
  constructor(config: {
    apiKey: string;
    apiUrl?: string;
    model?: string;
    maxTokens?: number;
    timeout?: number;
  }) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-3.5-turbo';
    this.maxTokens = config.maxTokens || 500;
    this.timeout = config.timeout || 10000;
  }
  
  async suggest(params: LLMSuggestParams): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a text transformation assistant. Task: ${params.task}`
            },
            {
              role: 'user',
              content: params.text
            }
          ],
          max_tokens: params.maxTokens || this.maxTokens,
          temperature: params.temperature || 0.7
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }
      
      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content || '';
      
      return this.validateOutput(suggestion);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('LLM request timeout');
      }
      throw error;
    }
  }
  
  private validateOutput(text: string): string {
    // Safety validation
    if (!text || text.length === 0) {
      throw new Error('LLM returned empty response');
    }
    
    if (text.length > this.maxTokens * 4) {
      text = text.substring(0, this.maxTokens * 4);
    }
    
    return text;
  }
}

export function deterministicFilter(text: string): string {
  // Apply deterministic safety rules
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/–|—/g, '-')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class MockLLMService implements LLMService {
  async suggest(params: LLMSuggestParams): Promise<string> {
    // Fallback to deterministic transformation
    return deterministicFilter(params.text);
  }
}
