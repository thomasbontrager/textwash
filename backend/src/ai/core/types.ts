/**
 * Core AI Types and Interfaces
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, any>;
}

export interface AIGenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
  systemPrompt?: string;
  context?: AIMessage[];
}

export interface AIGenerateResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  metadata?: Record<string, any>;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStructuredOptions extends AIGenerateOptions {
  schema: Record<string, any>; // JSON Schema
}

/**
 * Abstract AI Provider Interface
 * All AI providers must implement this interface
 */
export interface AIProvider {
  name: string;
  
  /**
   * Generate a completion from a prompt
   */
  generate(input: string, options?: AIGenerateOptions): Promise<AIGenerateResponse>;
  
  /**
   * Stream a completion from a prompt
   */
  stream(
    input: string,
    options?: AIGenerateOptions
  ): AsyncIterable<AIStreamChunk>;
  
  /**
   * Generate structured output matching a JSON schema
   */
  generateStructured(
    schema: Record<string, any>,
    input: string,
    options?: AIStructuredOptions
  ): Promise<any>;
  
  /**
   * Calculate cost estimate for a request
   */
  estimateCost(tokenCount: number, model?: string): number;
}

/**
 * AI Operation Types
 */
export enum AIOperationType {
  CONVERSATION = 'conversation',
  SUMMARIZATION = 'summarization',
  TRANSLATION = 'translation',
  REWRITING = 'rewriting',
  PLANNING = 'planning',
  CODE_REASONING = 'code_reasoning',
  DATA_ANALYSIS = 'data_analysis',
  STEP_BY_STEP = 'step_by_step',
  STRUCTURED_OUTPUT = 'structured_output',
  TOOL_USE = 'tool_use',
}

/**
 * Memory Types
 */
export enum MemoryType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  SEMANTIC = 'semantic',
}

/**
 * Session Context
 */
export interface SessionContext {
  sessionId: string;
  userId: string;
  messages: AIMessage[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
