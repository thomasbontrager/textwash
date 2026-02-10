import { Agent } from '../types';
import * as chokidar from 'chokidar';
import * as path from 'path';
import { profanityAgent, clarityAgent, whitespaceAgent, punctuationAgent } from '../agents/basicAgents';
import { hybridRewriteAgent, professionalToneAgent, casualToneAgent, conciseAgent } from '../agents/hybridAgents';

let AGENTS: Map<string, Agent> = new Map();
let watcher: chokidar.FSWatcher | null = null;

export function initializeAgents() {
  AGENTS.clear();
  
  // Register basic agents
  AGENTS.set('ProfanityTransformer', profanityAgent);
  AGENTS.set('ClarityTransformer', clarityAgent);
  AGENTS.set('WhitespaceNormalizer', whitespaceAgent);
  AGENTS.set('PunctuationNormalizer', punctuationAgent);
  
  // Register hybrid agents
  AGENTS.set('HybridRewrite', hybridRewriteAgent);
  AGENTS.set('ProfessionalTone', professionalToneAgent);
  AGENTS.set('CasualTone', casualToneAgent);
  AGENTS.set('ConciseRewrite', conciseAgent);
  
  console.log(`Loaded ${AGENTS.size} agents`);
}

export async function loadAgents(): Promise<void> {
  initializeAgents();
}

export function getAgent(name: string): Agent | undefined {
  return AGENTS.get(name);
}

export function getAllAgents(): Agent[] {
  return Array.from(AGENTS.values());
}

export function getAgentNames(): string[] {
  return Array.from(AGENTS.keys());
}

export function registerAgent(agent: Agent): void {
  AGENTS.set(agent.name, agent);
  console.log(`Registered agent: ${agent.name}`);
}

export function unregisterAgent(name: string): boolean {
  return AGENTS.delete(name);
}

export function startAgentHotReload(agentsPath?: string): void {
  if (watcher) {
    console.log('Agent hot-reload already running');
    return;
  }
  
  const watchPath = agentsPath || path.join(__dirname, '../agents');
  
  console.log(`Starting agent hot-reload on: ${watchPath}`);
  
  watcher = chokidar.watch(watchPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100
    }
  });
  
  watcher
    .on('change', async (filePath) => {
      console.log(`Agent file changed: ${filePath}`);
      await reloadAgents();
    })
    .on('add', async (filePath) => {
      console.log(`New agent file added: ${filePath}`);
      await reloadAgents();
    })
    .on('unlink', async (filePath) => {
      console.log(`Agent file removed: ${filePath}`);
      await reloadAgents();
    })
    .on('error', (error) => {
      console.error('Agent watcher error:', error);
    });
}

export function stopAgentHotReload(): void {
  if (watcher) {
    watcher.close();
    watcher = null;
    console.log('Agent hot-reload stopped');
  }
}

export async function reloadAgents(): Promise<void> {
  try {
    // Clear require cache for agent modules
    Object.keys(require.cache).forEach((key) => {
      if (key.includes('/agents/')) {
        delete require.cache[key];
      }
    });
    
    // Reload agents
    await loadAgents();
    console.log('Agents reloaded successfully');
  } catch (error) {
    console.error('Failed to reload agents:', error);
    throw error;
  }
}

// Initialize agents on module load
initializeAgents();
