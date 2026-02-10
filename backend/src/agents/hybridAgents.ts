import { Agent, SystemContext, AgentResult } from '../types';
import { deterministicFilter } from '../services/llm';

export const hybridRewriteAgent: Agent = {
  name: 'HybridRewrite',
  description: 'AI-powered rewriting with deterministic fallback',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    if (!system.config.llmEnabled) {
      const output = deterministicFilter(input);
      return { output, changed: output !== input };
    }
    
    try {
      const suggestion = await system.llm.suggest({
        task: 'rewrite this text to be clear and professional',
        text: input
      });
      
      const safe = deterministicFilter(suggestion);
      
      return {
        output: safe,
        changed: safe !== input,
        metadata: {
          usedLLM: true
        }
      };
    } catch (error) {
      console.error('LLM failed, using deterministic fallback:', error);
      const output = deterministicFilter(input);
      return {
        output,
        changed: output !== input,
        metadata: {
          usedLLM: false,
          fallback: true
        }
      };
    }
  }
};

export const professionalToneAgent: Agent = {
  name: 'ProfessionalTone',
  description: 'Converts text to professional tone',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    if (!system.config.llmEnabled || system.plan === 'FREE') {
      const output = deterministicFilter(input);
      return { output, changed: output !== input };
    }
    
    try {
      const suggestion = await system.llm.suggest({
        task: 'rewrite in a professional, formal tone',
        text: input,
        temperature: 0.5
      });
      
      const safe = deterministicFilter(suggestion);
      
      return {
        output: safe,
        changed: safe !== input,
        metadata: {
          tone: 'professional',
          usedLLM: true
        }
      };
    } catch (error) {
      const output = deterministicFilter(input);
      return {
        output,
        changed: output !== input,
        metadata: {
          usedLLM: false,
          fallback: true
        }
      };
    }
  }
};

export const casualToneAgent: Agent = {
  name: 'CasualTone',
  description: 'Converts text to casual, friendly tone',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    if (!system.config.llmEnabled || system.plan === 'FREE') {
      const output = deterministicFilter(input);
      return { output, changed: output !== input };
    }
    
    try {
      const suggestion = await system.llm.suggest({
        task: 'rewrite in a casual, friendly tone',
        text: input,
        temperature: 0.7
      });
      
      const safe = deterministicFilter(suggestion);
      
      return {
        output: safe,
        changed: safe !== input,
        metadata: {
          tone: 'casual',
          usedLLM: true
        }
      };
    } catch (error) {
      const output = deterministicFilter(input);
      return {
        output,
        changed: output !== input,
        metadata: {
          usedLLM: false,
          fallback: true
        }
      };
    }
  }
};

export const conciseAgent: Agent = {
  name: 'ConciseRewrite',
  description: 'Makes text more concise',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    if (!system.config.llmEnabled || system.plan === 'FREE') {
      const output = deterministicFilter(input);
      return { output, changed: output !== input };
    }
    
    try {
      const suggestion = await system.llm.suggest({
        task: 'rewrite this text to be more concise while keeping the meaning',
        text: input,
        temperature: 0.3
      });
      
      const safe = deterministicFilter(suggestion);
      
      return {
        output: safe,
        changed: safe !== input,
        metadata: {
          style: 'concise',
          usedLLM: true
        }
      };
    } catch (error) {
      const output = deterministicFilter(input);
      return {
        output,
        changed: output !== input,
        metadata: {
          usedLLM: false,
          fallback: true
        }
      };
    }
  }
};
