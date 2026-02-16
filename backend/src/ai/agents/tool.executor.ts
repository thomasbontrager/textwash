import { PrismaClient } from '@prisma/client';
import { ToolRegistry } from './tool.registry';
import {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolCategory,
} from './tool.types';
import Ajv from 'ajv';

const prisma = new PrismaClient();
const ajv = new Ajv();

/**
 * Tool Executor
 * Handles tool execution with validation, logging, and rate limiting
 */
export class ToolExecutor {
  /**
   * Execute a tool with full validation and logging
   */
  static async execute(
    toolName: string,
    input: any,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate tool exists
      const tool = ToolRegistry.getTool(toolName);
      if (!tool) {
        return this.createErrorResult(
          `Tool '${toolName}' not found`,
          startTime
        );
      }

      // Validate plan access
      if (!ToolRegistry.isToolAvailableForPlan(toolName, context.userPlan)) {
        return this.createErrorResult(
          `Tool '${toolName}' is not available for plan '${context.userPlan}'`,
          startTime
        );
      }

      // Validate input against schema
      const inputValid = ajv.validate(tool.definition.inputSchema, input);
      if (!inputValid) {
        return this.createErrorResult(
          `Invalid input: ${ajv.errorsText()}`,
          startTime
        );
      }

      // Check rate limits
      const rateLimitOk = await this.checkRateLimit(
        toolName,
        context.userId,
        tool.definition.rateLimitPerHour
      );
      if (!rateLimitOk) {
        return this.createErrorResult(
          `Rate limit exceeded for tool '${toolName}'`,
          startTime
        );
      }

      // Sanitize input
      const sanitizedInput = this.sanitizeInput(input);

      // Execute tool
      const result = await tool.execute(sanitizedInput, context);

      // Validate output against schema
      const outputValid = ajv.validate(
        tool.definition.outputSchema,
        result.output
      );
      if (!outputValid && result.success) {
        result.success = false;
        result.error = `Invalid tool output: ${ajv.errorsText()}`;
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      if (!result.metadata) {
        result.metadata = { executionTime };
      } else {
        result.metadata.executionTime = executionTime;
      }

      // Log execution
      await this.logExecution({
        toolName,
        input: sanitizedInput,
        result,
        context,
        executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // Log failed execution
      await this.logExecution({
        toolName,
        input,
        result: {
          success: false,
          output: null,
          error: errorMessage,
          metadata: { executionTime },
        },
        context,
        executionTime,
      });

      return this.createErrorResult(errorMessage, startTime);
    }
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  private static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters/patterns
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Check rate limits for a tool
   */
  private static async checkRateLimit(
    toolName: string,
    userId: string,
    rateLimitPerHour?: number
  ): Promise<boolean> {
    if (!rateLimitPerHour) {
      return true; // No rate limit configured
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const count = await prisma.toolExecution.count({
      where: {
        userId,
        toolName,
        createdAt: {
          gte: oneHourAgo,
        },
      },
    });

    return count < rateLimitPerHour;
  }

  /**
   * Log tool execution
   */
  private static async logExecution(params: {
    toolName: string;
    input: any;
    result: ToolExecutionResult;
    context: ToolExecutionContext;
    executionTime: number;
  }): Promise<void> {
    try {
      const tool = ToolRegistry.getTool(params.toolName);
      const featureType = tool?.definition.category || 'unknown';

      await prisma.toolExecution.create({
        data: {
          userId: params.context.userId,
          subscriptionId: params.context.subscriptionId,
          planId: params.context.planId,
          toolName: params.toolName,
          input: params.input,
          output: params.result.output,
          success: params.result.success,
          errorMessage: params.result.error,
          tokenCount: params.result.metadata?.tokenCount || 0,
          costEstimate: params.result.metadata?.cost || 0,
          executionTime: params.executionTime,
          featureType,
          metadata: params.result.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to log tool execution:', error);
      // Don't throw - logging failures shouldn't break execution
    }
  }

  /**
   * Create an error result
   */
  private static createErrorResult(
    error: string,
    startTime: number
  ): ToolExecutionResult {
    return {
      success: false,
      output: null,
      error,
      metadata: {
        executionTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Get user's tool usage statistics
   */
  static async getUserUsage(
    userId: string,
    toolName?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = { userId };

    if (toolName) {
      where.toolName = toolName;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [executions, totals] = await Promise.all([
      prisma.toolExecution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.toolExecution.aggregate({
        where,
        _sum: {
          tokenCount: true,
          costEstimate: true,
          executionTime: true,
        },
        _count: true,
      }),
    ]);

    return {
      executions,
      totalTokens: totals._sum.tokenCount || 0,
      totalCost: totals._sum.costEstimate || 0,
      totalExecutionTime: totals._sum.executionTime || 0,
      totalExecutions: totals._count,
    };
  }
}
