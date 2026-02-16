import { AIService } from '../core/ai.service';
import { MemoryService } from '../memory/memory.service';
import { ToolExecutor } from './tool.executor';
import { ToolRegistry } from './tool.registry';
import { AIGenerateOptions, AIOperationType } from '../core/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Service
 * Orchestrates AI conversations with tool use capabilities
 */
export class AgentService {
  /**
   * Execute an AI conversation with tool use capability
   */
  static async chat(params: {
    userId: string;
    subscriptionId?: string;
    planId?: string;
    userPlan: string;
    message: string;
    sessionId?: string;
    useTools?: boolean;
    systemPrompt?: string;
  }): Promise<{
    response: string;
    toolsUsed: string[];
    sessionId: string;
  }> {
    const sessionId = params.sessionId || uuidv4();
    const requestId = uuidv4();

    // Get session context
    const messages = MemoryService.getMessages(sessionId);

    // Get long-term memory context
    const memoryContext = await MemoryService.buildMemoryContext(params.userId);

    // Build system prompt with memory and tool info
    let systemPrompt = params.systemPrompt || 'You are a helpful AI assistant.';

    if (memoryContext) {
      systemPrompt += `\n\nUser Context:\n${memoryContext}`;
    }

    if (params.useTools) {
      const availableTools = ToolRegistry.getToolsForPlan(params.userPlan);
      const toolDescriptions = availableTools
        .map((tool) => `- ${tool.definition.name}: ${tool.definition.description}`)
        .join('\n');

      systemPrompt += `\n\nAvailable Tools:\n${toolDescriptions}`;
      systemPrompt += `\n\nYou can use tools by responding with a JSON object: {"tool": "tool_name", "input": {...}}`;
    }

    // Add user message to session
    MemoryService.addMessage(sessionId, params.userId, {
      role: 'user',
      content: params.message,
    });

    // Generate AI response
    const response = await AIService.generate(params.message, {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
      operationType: AIOperationType.CONVERSATION,
      systemPrompt,
      context: messages,
    });

    const toolsUsed: string[] = [];
    let finalResponse = response.content;

    // Check if AI wants to use a tool
    if (params.useTools && this.isToolRequest(response.content)) {
      try {
        const toolRequest = this.parseToolRequest(response.content);
        
        // Execute tool
        const toolResult = await ToolExecutor.execute(
          toolRequest.tool,
          toolRequest.input,
          {
            userId: params.userId,
            subscriptionId: params.subscriptionId,
            planId: params.planId,
            userPlan: params.userPlan,
            requestId,
          }
        );

        toolsUsed.push(toolRequest.tool);

        // Generate final response using tool result
        const finalGeneration = await AIService.generate(
          `Based on the tool result, provide a natural response to the user.\n\nOriginal question: ${params.message}\n\nTool result: ${JSON.stringify(toolResult.output)}`,
          {
            userId: params.userId,
            subscriptionId: params.subscriptionId,
            planId: params.planId,
            operationType: AIOperationType.CONVERSATION,
            systemPrompt: params.systemPrompt,
          }
        );

        finalResponse = finalGeneration.content;
      } catch (error) {
        console.error('Tool execution failed:', error);
        // Fall back to original response
      }
    }

    // Add assistant response to session
    MemoryService.addMessage(sessionId, params.userId, {
      role: 'assistant',
      content: finalResponse,
    });

    return {
      response: finalResponse,
      toolsUsed,
      sessionId,
    };
  }

  /**
   * Execute a planning task
   */
  static async plan(params: {
    userId: string;
    subscriptionId?: string;
    planId?: string;
    task: string;
    context?: string;
  }): Promise<{
    plan: any;
    steps: string[];
  }> {
    const prompt = `Create a detailed plan to accomplish this task: ${params.task}${
      params.context ? `\n\nContext: ${params.context}` : ''
    }\n\nProvide a structured plan with clear steps.`;

    const planSchema = {
      type: 'object',
      properties: {
        goal: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              step: { type: 'number' },
              action: { type: 'string' },
              description: { type: 'string' },
              estimatedTime: { type: 'string' },
            },
          },
        },
        resources: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    };

    const plan = await AIService.generateStructured(planSchema, prompt, {
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      planId: params.planId,
    });

    return {
      plan,
      steps: plan.steps?.map((s: any) => s.action) || [],
    };
  }

  /**
   * Check if AI response is a tool request
   */
  private static isToolRequest(content: string): boolean {
    try {
      const parsed = JSON.parse(content.trim());
      return parsed.tool && parsed.input;
    } catch {
      // Check for JSON in markdown code blocks
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          return parsed.tool && parsed.input;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Parse tool request from AI response
   */
  private static parseToolRequest(content: string): {
    tool: string;
    input: any;
  } {
    // Try direct JSON parse
    try {
      const parsed = JSON.parse(content.trim());
      if (parsed.tool && parsed.input) {
        return parsed;
      }
    } catch {
      // Try extracting from markdown code block
      const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.tool && parsed.input) {
          return parsed;
        }
      }
    }

    throw new Error('Invalid tool request format');
  }
}
