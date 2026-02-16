/**
 * Tool Types and Interfaces
 */

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: Record<string, any>; // JSON Schema for input
  outputSchema: Record<string, any>; // JSON Schema for output
  requiredPlans: string[]; // Plans that have access to this tool
  requiredPermissions?: string[]; // Optional permissions
  rateLimitPerHour?: number; // Tool-specific rate limit
  costPerExecution?: number; // Estimated cost
}

export enum ToolCategory {
  WEB = 'web',
  SYSTEM = 'system',
  FILE = 'file',
  MEDIA = 'media',
  DATA = 'data',
}

export interface ToolExecutionContext {
  userId: string;
  subscriptionId?: string;
  planId?: string;
  userPlan: string;
  requestId: string;
}

export interface ToolExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  metadata?: {
    executionTime: number;
    tokenCount?: number;
    cost?: number;
    [key: string]: any;
  };
}

export interface Tool {
  definition: ToolDefinition;
  execute(input: any, context: ToolExecutionContext): Promise<ToolExecutionResult>;
}
