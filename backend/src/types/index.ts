import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

export interface Agent {
  name: string;
  description?: string;
  run: (input: string, system: SystemContext) => Promise<AgentResult>;
}

export interface AgentResult {
  output: string;
  changed: boolean;
  metadata?: Record<string, any>;
}

export interface SystemContext {
  config: SystemConfig;
  llm: LLMService;
  userId?: string;
  organizationId?: string;
  plan: string;
}

export interface SystemConfig {
  llmEnabled: boolean;
  llmMaxTokens: number;
  llmTimeout: number;
  llmModel: string;
}

export interface LLMService {
  suggest: (params: LLMSuggestParams) => Promise<string>;
}

export interface LLMSuggestParams {
  task: string;
  text: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AgentRules {
  [key: string]: any;
}

export interface PolicyRules {
  forbid?: string[];
  require?: string[];
  tone?: string[];
  compliance?: string[];
  [key: string]: any;
}

export interface CleanRequest {
  text: string;
  mode?: string;
  policies?: string[];
}

export interface CleanResponse {
  result: string;
  agentsApplied: string[];
  confidenceScore: number;
  metadata?: Record<string, any>;
}
