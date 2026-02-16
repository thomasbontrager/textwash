import { Tool, ToolDefinition, ToolCategory } from './tool.types';

/**
 * Tool Registry
 * Central registry for all available tools with plan-based access control
 */
export class ToolRegistry {
  private static tools: Map<string, Tool> = new Map();

  /**
   * Register a tool
   */
  static register(tool: Tool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(`Tool ${tool.definition.name} is already registered`);
    }
    this.tools.set(tool.definition.name, tool);
  }

  /**
   * Get a tool by name
   */
  static getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  static getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  static getToolsByCategory(category: ToolCategory): Tool[] {
    return Array.from(this.tools.values()).filter(
      (tool) => tool.definition.category === category
    );
  }

  /**
   * Get tools available for a plan
   */
  static getToolsForPlan(planName: string): Tool[] {
    return Array.from(this.tools.values()).filter((tool) =>
      tool.definition.requiredPlans.includes(planName.toUpperCase())
    );
  }

  /**
   * Check if a tool is available for a plan
   */
  static isToolAvailableForPlan(toolName: string, planName: string): boolean {
    const tool = this.getTool(toolName);
    if (!tool) return false;
    return tool.definition.requiredPlans.includes(planName.toUpperCase());
  }

  /**
   * Get tool definition
   */
  static getDefinition(toolName: string): ToolDefinition | undefined {
    const tool = this.getTool(toolName);
    return tool?.definition;
  }

  /**
   * List all tool names
   */
  static listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Unregister a tool (useful for testing)
   */
  static unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  /**
   * Clear all tools (useful for testing)
   */
  static clear(): void {
    this.tools.clear();
  }
}
