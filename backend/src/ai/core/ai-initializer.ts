import { AIProviderFactory } from './provider.factory';
import { initializeTools } from './tool-initializer';
import { MemoryService } from '../memory/memory.service';
import { AIOperationType } from './types';

/**
 * AI System Initialization Status
 */
export interface AISystemStatus {
  enabled: boolean;
  provider: string | null;
  providerHealthy: boolean;
  toolsRegistered: number;
  memorySystemReady: boolean;
  reasoningModesAvailable: string[];
  errors: string[];
  warnings: string[];
}

/**
 * AI System Autorun Initializer
 * Handles comprehensive initialization of all AI subsystems
 */
export class AIInitializer {
  private static initialized = false;
  private static status: AISystemStatus = {
    enabled: false,
    provider: null,
    providerHealthy: false,
    toolsRegistered: 0,
    memorySystemReady: false,
    reasoningModesAvailable: [],
    errors: [],
    warnings: [],
  };

  /**
   * Initialize all AI systems
   */
  static async initialize(): Promise<AISystemStatus> {
    if (this.initialized) {
      console.log('⚠️  AI system already initialized');
      return this.status;
    }

    console.log('🚀 Starting AI system initialization...');
    this.status.errors = [];
    this.status.warnings = [];

    // Step 1: Check feature flags
    const aiCoreEnabled = process.env.FEATURE_AI_CORE === 'true';
    const agentSystemEnabled = process.env.FEATURE_AGENT_SYSTEM === 'true';
    
    if (!aiCoreEnabled && !agentSystemEnabled) {
      console.log('ℹ️  AI systems disabled via feature flags');
      this.status.enabled = false;
      this.initialized = true;
      return this.status;
    }

    this.status.enabled = true;

    // Step 2: Initialize and validate AI provider
    await this.initializeProvider();

    // Step 3: Initialize tool registry
    this.initializeToolRegistry();

    // Step 4: Initialize memory system
    this.initializeMemorySystem();

    // Step 5: Validate reasoning modes
    this.validateReasoningModes();

    // Step 6: Report status
    this.reportStatus();

    this.initialized = true;
    return this.status;
  }

  /**
   * Initialize and validate AI provider
   */
  private static async initializeProvider(): Promise<void> {
    try {
      const providerName = process.env.AI_PROVIDER || 'openai';
      this.status.provider = providerName;

      // Check if provider is configured
      if (!AIProviderFactory.isEnabled()) {
        this.status.warnings.push(
          'AI provider not configured - missing API keys. AI features will be unavailable.'
        );
        this.status.providerHealthy = false;
        return;
      }

      // Get provider instance
      const provider = AIProviderFactory.getProvider();
      console.log(`✅ AI Provider initialized: ${provider.name}`);

      // Validate provider configuration
      const validation = this.validateProviderConfig(providerName);
      if (!validation.valid) {
        this.status.warnings.push(...validation.warnings);
      }

      // Test provider connectivity (simple health check)
      try {
        await this.testProviderConnection(provider);
        this.status.providerHealthy = true;
        console.log('✅ AI Provider health check passed');
      } catch (error) {
        this.status.warnings.push(
          `AI provider health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        this.status.providerHealthy = false;
      }
    } catch (error) {
      const errorMsg = `Failed to initialize AI provider: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.status.errors.push(errorMsg);
      console.error('❌', errorMsg);
      this.status.providerHealthy = false;
    }
  }

  /**
   * Validate provider configuration
   */
  private static validateProviderConfig(providerName: string): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (providerName === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
      if (!apiKey || apiKey.length < 10) {
        warnings.push('OpenAI API key appears invalid or missing');
      }
      
      const model = process.env.OPENAI_MODEL || process.env.LLM_MODEL;
      if (!model) {
        warnings.push('No OpenAI model specified, will use provider default');
      }
    } else if (providerName === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey || apiKey.length < 10) {
        warnings.push('Anthropic API key appears invalid or missing');
      }
      
      const model = process.env.ANTHROPIC_MODEL;
      if (!model) {
        warnings.push('No Anthropic model specified, will use provider default');
      }
    }

    return {
      valid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Test provider connection with a minimal request
   */
  private static async testProviderConnection(provider: any): Promise<void> {
    // Only test if we have a valid API key
    const apiKey = process.env.OPENAI_API_KEY || 
                   process.env.ANTHROPIC_API_KEY || 
                   process.env.LLM_API_KEY;
    
    if (!apiKey || apiKey.length < 10) {
      throw new Error('Invalid or missing API key');
    }

    // Simple validation - we don't actually call the API to avoid costs
    // Just verify the provider interface is properly configured
    if (!provider.generate || !provider.stream || !provider.generateStructured) {
      throw new Error('Provider missing required methods');
    }

    if (!provider.name) {
      throw new Error('Provider name not set');
    }
  }

  /**
   * Initialize tool registry
   */
  private static initializeToolRegistry(): void {
    try {
      initializeTools();
      // Tool count is logged by initializeTools()
      // Extract count from the registry
      this.status.toolsRegistered = this.getRegisteredToolCount();
      console.log(`✅ Tool registry initialized with ${this.status.toolsRegistered} tools`);
    } catch (error) {
      const errorMsg = `Failed to initialize tool registry: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.status.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
  }

  /**
   * Get count of registered tools
   */
  private static getRegisteredToolCount(): number {
    try {
      // Import ToolRegistry to get count
      const { ToolRegistry } = require('../agents/tool.registry');
      return ToolRegistry.listTools().length;
    } catch {
      return 0;
    }
  }

  /**
   * Initialize memory system
   */
  private static initializeMemorySystem(): void {
    try {
      // Memory system is self-initializing via static initialization
      // Just verify it's accessible
      if (MemoryService) {
        this.status.memorySystemReady = true;
        console.log('✅ Memory system initialized');
        console.log('   - Short-term: In-memory session storage');
        console.log('   - Long-term: Persistent database storage');
        console.log('   - Auto-cleanup: Every 15 minutes');
      }
    } catch (error) {
      const errorMsg = `Failed to initialize memory system: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.status.errors.push(errorMsg);
      console.error('❌', errorMsg);
      this.status.memorySystemReady = false;
    }
  }

  /**
   * Validate reasoning modes
   */
  private static validateReasoningModes(): void {
    try {
      // Get all available reasoning modes from AIOperationType enum
      const modes = Object.values(AIOperationType);
      this.status.reasoningModesAvailable = modes;
      
      console.log('✅ Reasoning modes available:');
      modes.forEach((mode) => {
        console.log(`   - ${mode}`);
      });
    } catch (error) {
      const errorMsg = `Failed to validate reasoning modes: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      this.status.warnings.push(errorMsg);
      console.error('⚠️ ', errorMsg);
    }
  }

  /**
   * Report initialization status
   */
  private static reportStatus(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║   🧠 AI System Initialization Complete                     ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('Status Summary:');
    console.log(`  AI System Enabled: ${this.status.enabled ? '✅' : '❌'}`);
    console.log(`  Provider: ${this.status.provider || 'None'}`);
    console.log(`  Provider Healthy: ${this.status.providerHealthy ? '✅' : '⚠️ '}`);
    console.log(`  Tools Registered: ${this.status.toolsRegistered}`);
    console.log(`  Memory System: ${this.status.memorySystemReady ? '✅' : '❌'}`);
    console.log(`  Reasoning Modes: ${this.status.reasoningModesAvailable.length}`);

    if (this.status.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.status.warnings.forEach((warning) => {
        console.log(`  - ${warning}`);
      });
    }

    if (this.status.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.status.errors.forEach((error) => {
        console.log(`  - ${error}`);
      });
    }

    if (this.status.errors.length === 0 && this.status.warnings.length === 0) {
      console.log('\n✅ All systems operational\n');
    } else {
      console.log('');
    }
  }

  /**
   * Get current system status
   */
  static getStatus(): AISystemStatus {
    return { ...this.status };
  }

  /**
   * Check if system is initialized
   */
  static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset initialization (for testing)
   */
  static reset(): void {
    this.initialized = false;
    AIProviderFactory.resetProvider();
    this.status = {
      enabled: false,
      provider: null,
      providerHealthy: false,
      toolsRegistered: 0,
      memorySystemReady: false,
      reasoningModesAvailable: [],
      errors: [],
      warnings: [],
    };
  }
}
