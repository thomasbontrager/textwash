import { PrismaClient } from '@prisma/client';
import { Agent, PolicyRules } from '../types';

const prisma = new PrismaClient();

export async function getPolicies(organizationId: string): Promise<PolicyRules[]> {
  const policies = await prisma.policy.findMany({
    where: {
      organizationId,
      enabled: true
    }
  });
  
  return policies.map((p: any) => p.rules as PolicyRules);
}

export function applyPolicies(agents: Agent[], policies: PolicyRules[]): Agent[] {
  if (!policies || policies.length === 0) {
    return agents;
  }
  
  let filteredAgents = [...agents];
  
  for (const policy of policies) {
    // Filter out forbidden agents
    if (policy.forbid && policy.forbid.length > 0) {
      filteredAgents = filteredAgents.filter(
        agent => !policy.forbid!.some(forbidden => 
          agent.name.toLowerCase().includes(forbidden.toLowerCase())
        )
      );
    }
    
    // Filter to only required agents
    if (policy.require && policy.require.length > 0) {
      filteredAgents = filteredAgents.filter(
        agent => policy.require!.some(required =>
          agent.name.toLowerCase().includes(required.toLowerCase())
        )
      );
    }
  }
  
  return filteredAgents;
}

export function validateAgainstPolicies(
  text: string,
  policies: PolicyRules[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  
  for (const policy of policies) {
    // Check tone restrictions
    if (policy.tone && policy.tone.length > 0) {
      const textLower = text.toLowerCase();
      const toneViolations = policy.tone.filter(tone => {
        // Simple tone detection (can be enhanced)
        if (tone === 'casual' && /\b(hey|yeah|gonna|wanna)\b/i.test(text)) {
          return true;
        }
        if (tone === 'emoji' && /[\u{1F600}-\u{1F64F}]/u.test(text)) {
          return true;
        }
        return false;
      });
      
      violations.push(...toneViolations.map(t => `Forbidden tone: ${t}`));
    }
    
    // Check compliance rules
    if (policy.compliance && policy.compliance.length > 0) {
      for (const rule of policy.compliance) {
        if (rule === 'no-profanity') {
          const profanityPattern = /\b(damn|hell|crap)\b/i;
          if (profanityPattern.test(text)) {
            violations.push('Compliance violation: profanity detected');
          }
        }
        if (rule === 'professional-only') {
          const casualPattern = /\b(hey|yeah|gonna|wanna)\b/i;
          if (casualPattern.test(text)) {
            violations.push('Compliance violation: unprofessional language');
          }
        }
      }
    }
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

export async function createPolicy(
  organizationId: string,
  name: string,
  type: string,
  rules: PolicyRules
): Promise<void> {
  await prisma.policy.create({
    data: {
      organizationId,
      name,
      type,
      rules,
      enabled: true
    }
  });
}

export async function updatePolicy(
  policyId: string,
  rules: PolicyRules,
  enabled?: boolean
): Promise<void> {
  await prisma.policy.update({
    where: { id: policyId },
    data: {
      rules,
      enabled
    }
  });
}

export async function deletePolicy(policyId: string): Promise<void> {
  await prisma.policy.delete({
    where: { id: policyId }
  });
}
