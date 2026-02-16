import { AIProvider } from '../core/types';
import { OpenAIProvider } from '../providers/openai.provider';
import { AnthropicProvider } from '../providers/anthropic.provider';

/**
 * AI Provider Factory
 * Creates and configures AI providers based on environment configuration
 */
export class AIProviderFactory {
  private static instance: AIProvider | null = null;

  /**
   * Get the configured AI provider instance
   */
  static getProvider(): AIProvider {
    if (this.instance) {
      return this.instance;
    }

    const providerName = process.env.AI_PROVIDER || 'openai';
    
    switch (providerName.toLowerCase()) {
      case 'openai':
        this.instance = new OpenAIProvider({
          apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '',
          apiUrl: process.env.OPENAI_API_URL || process.env.LLM_API_URL,
          defaultModel: process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'gpt-4',
        });
        break;

      case 'anthropic':
        this.instance = new AnthropicProvider({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          apiUrl: process.env.ANTHROPIC_API_URL,
          defaultModel: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        });
        break;

      default:
        throw new Error(`Unsupported AI provider: ${providerName}`);
    }

    return this.instance;
  }

  /**
   * Reset the provider instance (useful for testing)
   */
  static resetProvider(): void {
    this.instance = null;
  }

  /**
   * Check if AI is enabled
   */
  static isEnabled(): boolean {
    return !!(
      process.env.AI_PROVIDER &&
      (process.env.OPENAI_API_KEY ||
        process.env.ANTHROPIC_API_KEY ||
        process.env.LLM_API_KEY)
    );
  }
}
