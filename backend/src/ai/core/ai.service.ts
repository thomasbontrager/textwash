import { PrismaClient } from '@prisma/client';
import { AIProviderFactory } from './provider.factory';
import {
  AIGenerateOptions,
  AIGenerateResponse,
  AIStreamChunk,
  AIOperationType,
} from './types';

const prisma = new PrismaClient();

/**
 * Main AI Service
 * Handles AI operations with usage tracking and billing
 */
export class AIService {
  /**
   * Generate AI completion with usage tracking
   */
  static async generate(
    input: string,
    options: AIGenerateOptions & {
      userId: string;
      subscriptionId?: string;
      planId?: string;
      operationType?: AIOperationType;
    }
  ): Promise<AIGenerateResponse> {
    const startTime = Date.now();
    const provider = AIProviderFactory.getProvider();

    try {
      // Generate completion
      const response = await provider.generate(input, options);

      // Calculate cost
      const cost = provider.estimateCost(response.usage.totalTokens, options.model);
      const executionTime = Date.now() - startTime;

      // Log usage
      await this.logUsage({
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        planId: options.planId,
        model: response.model,
        tokenCount: response.usage.totalTokens,
        cost,
        operation: options.operationType || AIOperationType.CONVERSATION,
        executionTime,
        metadata: {
          finishReason: response.finishReason,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
        },
      });

      return response;
    } catch (error) {
      // Log failed attempt
      await this.logUsage({
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        planId: options.planId,
        model: options.model || 'unknown',
        tokenCount: 0,
        cost: 0,
        operation: options.operationType || AIOperationType.CONVERSATION,
        executionTime: Date.now() - startTime,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failed: true,
        },
      });

      throw error;
    }
  }

  /**
   * Stream AI completion
   */
  static async *stream(
    input: string,
    options: AIGenerateOptions & {
      userId: string;
      subscriptionId?: string;
      planId?: string;
      operationType?: AIOperationType;
    }
  ): AsyncIterable<AIStreamChunk> {
    const provider = AIProviderFactory.getProvider();
    const startTime = Date.now();
    let totalTokens = 0;

    try {
      for await (const chunk of provider.stream(input, options)) {
        yield chunk;

        if (chunk.done && chunk.usage) {
          totalTokens = chunk.usage.totalTokens;
        }
      }

      // Log usage after stream completes
      if (totalTokens > 0) {
        const cost = provider.estimateCost(totalTokens, options.model);
        const executionTime = Date.now() - startTime;

        await this.logUsage({
          userId: options.userId,
          subscriptionId: options.subscriptionId,
          planId: options.planId,
          model: options.model || 'unknown',
          tokenCount: totalTokens,
          cost,
          operation: options.operationType || AIOperationType.CONVERSATION,
          executionTime,
          metadata: {
            streamed: true,
          },
        });
      }
    } catch (error) {
      // Log failed attempt
      await this.logUsage({
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        planId: options.planId,
        model: options.model || 'unknown',
        tokenCount: 0,
        cost: 0,
        operation: options.operationType || AIOperationType.CONVERSATION,
        executionTime: Date.now() - startTime,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failed: true,
          streamed: true,
        },
      });

      throw error;
    }
  }

  /**
   * Generate structured output
   */
  static async generateStructured(
    schema: Record<string, any>,
    input: string,
    options: AIGenerateOptions & {
      userId: string;
      subscriptionId?: string;
      planId?: string;
    }
  ): Promise<any> {
    const startTime = Date.now();
    const provider = AIProviderFactory.getProvider();

    try {
      const result = await provider.generateStructured(schema, input, {
        ...options,
        schema,
      });

      // Estimate tokens (rough approximation)
      const estimatedTokens = Math.ceil(
        (input.length + JSON.stringify(result).length) / 4
      );
      const cost = provider.estimateCost(estimatedTokens, options.model);
      const executionTime = Date.now() - startTime;

      // Log usage
      await this.logUsage({
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        planId: options.planId,
        model: options.model || 'unknown',
        tokenCount: estimatedTokens,
        cost,
        operation: AIOperationType.STRUCTURED_OUTPUT,
        executionTime,
        metadata: {
          schema: schema,
          structured: true,
        },
      });

      return result;
    } catch (error) {
      // Log failed attempt
      await this.logUsage({
        userId: options.userId,
        subscriptionId: options.subscriptionId,
        planId: options.planId,
        model: options.model || 'unknown',
        tokenCount: 0,
        cost: 0,
        operation: AIOperationType.STRUCTURED_OUTPUT,
        executionTime: Date.now() - startTime,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          failed: true,
        },
      });

      throw error;
    }
  }

  /**
   * Log AI usage to database
   */
  private static async logUsage(data: {
    userId: string;
    subscriptionId?: string;
    planId?: string;
    model: string;
    tokenCount: number;
    cost: number;
    operation: string;
    executionTime: number;
    metadata?: any;
  }): Promise<void> {
    try {
      await prisma.aIUsageLog.create({
        data: {
          userId: data.userId,
          subscriptionId: data.subscriptionId,
          planId: data.planId,
          model: data.model,
          tokensUsed: data.tokenCount,
          tokenCount: data.tokenCount,
          cost: data.cost,
          costEstimate: data.cost,
          operation: data.operation,
          featureType: data.operation,
          executionTime: data.executionTime,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      console.error('Failed to log AI usage:', error);
      // Don't throw - logging failures shouldn't break the main operation
    }
  }

  /**
   * Get user's AI usage statistics
   */
  static async getUserUsage(userId: string, startDate?: Date, endDate?: Date) {
    const where: any = { userId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, totals] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.aIUsageLog.aggregate({
        where,
        _sum: {
          tokenCount: true,
          costEstimate: true,
        },
        _count: true,
      }),
    ]);

    return {
      logs,
      totalTokens: totals._sum.tokenCount || 0,
      totalCost: totals._sum.costEstimate || 0,
      totalRequests: totals._count,
    };
  }
}
