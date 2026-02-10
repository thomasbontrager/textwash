import { Agent, SystemContext, AgentResult } from '../types';
import { getRules } from '../services/ruleLoader';

export const profanityAgent: Agent = {
  name: 'ProfanityTransformer',
  description: 'Replaces profanity with appropriate alternatives',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    const rules = await getRules('ProfanityTransformer');
    let output = input;
    const replacements: string[] = [];
    
    const profanityMap = rules.map || {
      'damn': 'darn',
      'hell': 'heck',
      'crap': 'crud'
    };
    
    for (const [bad, good] of Object.entries(profanityMap)) {
      const regex = new RegExp(`\\b${bad}\\b`, 'gi');
      const matches = output.match(regex);
      if (matches) {
        output = output.replace(regex, good as string);
        replacements.push(`${bad} → ${good}`);
      }
    }
    
    return {
      output,
      changed: output !== input,
      metadata: {
        replacements
      }
    };
  }
};

export const clarityAgent: Agent = {
  name: 'ClarityTransformer',
  description: 'Improves text clarity and readability',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    const rules = await getRules('ClarityTransformer');
    let output = input;
    
    const clarityRules = rules.replacements || [
      { pattern: /\bvery\s+(\w+)/gi, replacement: '$1' },
      { pattern: /\breally\s+(\w+)/gi, replacement: '$1' },
      { pattern: /\bactually\s+/gi, replacement: '' }
    ];
    
    for (const rule of clarityRules) {
      if (rule.pattern && rule.replacement !== undefined) {
        const regex = new RegExp(rule.pattern);
        output = output.replace(regex, rule.replacement);
      }
    }
    
    output = output
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return {
      output,
      changed: output !== input
    };
  }
};

export const whitespaceAgent: Agent = {
  name: 'WhitespaceNormalizer',
  description: 'Normalizes whitespace and line breaks',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    const output = input
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim();
    
    return {
      output,
      changed: output !== input
    };
  }
};

export const punctuationAgent: Agent = {
  name: 'PunctuationNormalizer',
  description: 'Normalizes punctuation marks',
  
  async run(input: string, system: SystemContext): Promise<AgentResult> {
    const output = input
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/–|—/g, '-')
      .replace(/\.{3,}/g, '...')
      .replace(/\s+([.,!?;:])/g, '$1')
      .replace(/([.,!?;:])\s+/g, '$1 ');
    
    return {
      output,
      changed: output !== input
    };
  }
};
