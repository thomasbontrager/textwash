import { PrismaClient } from '@prisma/client';
import { AIMessage, SessionContext } from '../core/types';

const prisma = new PrismaClient();

/**
 * Memory Service
 * Handles short-term (session) and long-term (persistent) memory
 */
export class MemoryService {
  // In-memory session storage (short-term)
  private static sessions: Map<string, SessionContext> = new Map();

  /**
   * Get or create a session
   */
  static getSession(sessionId: string, userId: string): SessionContext {
    let session = this.sessions.get(sessionId);
    
    if (!session) {
      session = {
        sessionId,
        userId,
        messages: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * Add message to session
   */
  static addMessage(
    sessionId: string,
    userId: string,
    message: AIMessage
  ): void {
    const session = this.getSession(sessionId, userId);
    session.messages.push(message);
    session.updatedAt = new Date();

    // Limit session history to last 20 messages
    if (session.messages.length > 20) {
      session.messages = session.messages.slice(-20);
    }
  }

  /**
   * Get session messages
   */
  static getMessages(sessionId: string): AIMessage[] {
    const session = this.sessions.get(sessionId);
    return session?.messages || [];
  }

  /**
   * Clear session
   */
  static clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Store long-term memory
   */
  static async storeMemory(
    userId: string,
    memoryType: string,
    key: string,
    value: any,
    options?: {
      subscriptionId?: string;
      planId?: string;
      confidence?: number;
      source?: string;
    }
  ): Promise<void> {
    await prisma.userMemory.upsert({
      where: {
        userId_memoryType_key: {
          userId,
          memoryType,
          key,
        },
      },
      update: {
        value,
        confidence: options?.confidence,
        source: options?.source,
        lastAccessed: new Date(),
        accessCount: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        userId,
        subscriptionId: options?.subscriptionId,
        planId: options?.planId,
        memoryType,
        key,
        value,
        confidence: options?.confidence || 1.0,
        source: options?.source,
        lastAccessed: new Date(),
        accessCount: 1,
      },
    });
  }

  /**
   * Retrieve long-term memory
   */
  static async getMemory(
    userId: string,
    memoryType?: string,
    key?: string
  ): Promise<any[]> {
    const where: any = { userId };
    if (memoryType) where.memoryType = memoryType;
    if (key) where.key = key;

    const memories = await prisma.userMemory.findMany({
      where,
      orderBy: { lastAccessed: 'desc' },
    });

    // Update access time
    if (memories.length > 0) {
      const ids = memories.map((m) => m.id);
      await prisma.userMemory.updateMany({
        where: { id: { in: ids } },
        data: {
          lastAccessed: new Date(),
          accessCount: { increment: 1 },
        },
      });
    }

    return memories;
  }

  /**
   * Delete memory
   */
  static async deleteMemory(
    userId: string,
    memoryType: string,
    key: string
  ): Promise<void> {
    await prisma.userMemory.delete({
      where: {
        userId_memoryType_key: {
          userId,
          memoryType,
          key,
        },
      },
    });
  }

  /**
   * Build context from long-term memory for AI prompts
   */
  static async buildMemoryContext(userId: string): Promise<string> {
    const memories = await this.getMemory(userId);
    
    if (memories.length === 0) {
      return '';
    }

    const contextParts: string[] = [];

    // Group by memory type
    const grouped = memories.reduce((acc, mem) => {
      if (!acc[mem.memoryType]) acc[mem.memoryType] = [];
      acc[mem.memoryType].push(mem);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [type, mems] of Object.entries(grouped)) {
      if (Array.isArray(mems) && mems.length > 0) {
        contextParts.push(`## ${type.toUpperCase()}`);
        mems.slice(0, 5).forEach((mem: any) => {
          contextParts.push(`- ${mem.key}: ${JSON.stringify(mem.value)}`);
        });
      }
    }

    return contextParts.join('\n');
  }

  /**
   * Clean up old sessions (call periodically)
   */
  static cleanupSessions(maxAgeMinutes: number = 60): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const ageMinutes =
        (now.getTime() - session.updatedAt.getTime()) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach((id) => this.sessions.delete(id));
  }
}

// Clean up old sessions every 15 minutes
setInterval(() => {
  MemoryService.cleanupSessions();
}, 15 * 60 * 1000);
