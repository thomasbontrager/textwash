---
name: textwash-master-ai-orchestrator
description: Governs orchestration, coordination, lifecycle management, cross-agent communication, and system-wide execution flow between all AI subsystems inside TextWash, including Core AI Engine, Tool System, Video Engine, Multimodal Media, Billing, Security, and Personalization layers.
---

# TextWash Master AI Orchestrator

## Purpose

This agent is responsible for coordinating all AI subsystems inside TextWash.

It does NOT implement features directly.

It ensures:

- Correct execution order
- Cross-system validation
- Safe lifecycle transitions
- Inter-agent communication
- Feature flag enforcement
- Failure recovery orchestration
- System consistency

This is the control layer of the AI platform.

---

## Scope of Authority

This agent governs interactions between:

- Core AI Engine
- Agent Tool Orchestrator
- Video Engine
- Multimodal Media
- Billing & Metering Guardian
- Security & Compliance Guardian
- Personalization Architect
- Queue Infrastructure
- Storage Layer

No subsystem may bypass orchestration rules.

---

## Directory Ownership

/src/orchestration
ai-orchestrator.service.ts
execution-pipeline.service.ts
lifecycle-manager.service.ts
feature-gate.service.ts
failure-recovery.service.ts
cross-agent-bridge.service.ts


This layer coordinates — it does not duplicate logic.

---

## Core Responsibilities

### 1. Cross-Agent Execution Flow

For any AI-triggered request, orchestrator must enforce:

1. Feature flag validation
2. Security validation
3. Billing validation
4. Entitlement validation
5. Context enrichment (Personalization)
6. Execution delegation
7. Post-execution validation
8. Usage reconciliation
9. Audit logging

No subsystem may reorder this pipeline.

---

### 2. AI Request Lifecycle Management

For AI chat or structured generation:

- Route request to Core AI Engine
- Inject personalization context
- Validate structured output
- Pass tool calls to Tool Orchestrator
- Validate tool results
- Return sanitized response

Must maintain:

- Deterministic execution order
- Structured error handling
- Full audit trail

---

### 3. Tool Invocation Lifecycle

When LLM proposes tool call:

- Security agent validates
- Billing agent validates
- Tool orchestrator executes
- Security validates output
- Billing reconciles usage
- Orchestrator returns structured response

No direct LLM → Tool execution allowed.

---

### 4. Video Job Orchestration

Video creation must:

1. Validate feature flags
2. Validate billing
3. Validate security
4. Create VideoJob
5. Queue job
6. Monitor progress
7. Handle retry logic
8. Reconcile billing
9. Update status
10. Emit event

Orchestrator must:

- Prevent duplicate jobs
- Prevent concurrent abuse
- Prevent inconsistent state

---

### 5. Multimodal Request Coordination

For image/audio:

- Validate billing
- Validate file constraints
- Validate plan limits
- Route to correct service
- Validate output
- Log usage

Orchestrator ensures correct order.

---

### 6. Failure Recovery

Must handle:

- Provider timeouts
- Partial execution failures
- Queue worker crashes
- Billing reconciliation mismatches
- Storage upload failures
- CDN propagation issues

Must:

- Retry where safe
- Roll back where necessary
- Log all failures
- Prevent duplicate billing

---

### 7. Feature Flag Governance

Must centralize evaluation of:

FEATURE_AI_CORE
FEATURE_AGENT_SYSTEM
FEATURE_VIDEO
FEATURE_AUDIO
FEATURE_RAG
FEATURE_AVATAR


Feature flag decisions must:

- Be evaluated before execution
- Be cached safely
- Not rely on frontend
- Be consistent across services

---

### 8. State Consistency Enforcement

Must guarantee:

- VideoJob status accurate
- ToolExecution status accurate
- AIUsage reconciled
- No orphaned MediaAsset
- No incomplete billing state
- No partially stored memory

Orchestrator owns cross-service consistency validation.

---

### 9. Event System Integration

Must emit structured events:

- AI_EXECUTION_STARTED
- AI_EXECUTION_COMPLETED
- TOOL_EXECUTED
- VIDEO_JOB_STARTED
- VIDEO_JOB_COMPLETED
- BILLING_RECONCILED
- SECURITY_BLOCKED
- AUTOMATION_TRIGGERED

Events must:

- Be logged
- Be traceable
- Support analytics integration

---

### 10. Concurrency Management

Must enforce:

- Per-user concurrent AI execution limits
- Per-user concurrent video jobs
- Per-user tool execution limits
- Global system protection thresholds

Must prevent:

- Double execution
- Duplicate billing
- Race conditions

---

### 11. Observability & Monitoring

Must integrate with:

- Logging system
- Metrics collection
- Performance monitoring
- Error reporting
- Audit logging

Must track:

- End-to-end latency
- Token burn rate
- Tool execution latency
- Video render time
- Failure rates

---

### 12. Zero-Duplication Rule

This agent must NOT:

- Reimplement billing logic
- Reimplement security logic
- Reimplement AI provider logic
- Reimplement tool registry
- Reimplement video engine

It coordinates — it does not duplicate.

---

## Security Requirements

Must ensure:

- No bypass of validation pipeline
- No direct subsystem access without checks
- No execution without feature validation
- No inconsistent billing state
- No unlogged AI activity

Must integrate with Security Guardian before and after execution.

---

## Billing Protection

Must ensure:

- Billing validation happens before heavy processing
- Billing reconciliation happens after execution
- No credit double-deduction
- No silent failure on cost mismatch

Billing layer remains authoritative.
Orchestrator enforces ordering.

---

## Personalization Integration

Must:

- Inject context only after validation
- Respect token limits
- Avoid sensitive memory injection
- Ensure GDPR-compliant deletion flows

---

## Code Standards

- Fully typed TypeScript
- Deterministic execution pipeline
- No circular dependencies
- Clean service orchestration
- Clear dependency boundaries
- Testable execution flows
- Centralized error handling
- Structured logging
- Idempotent operations

---

## Non-Negotiable Constraints

- No subsystem bypass
- No reordered validation
- No direct LLM → tool execution
- No video job without billing validation
- No memory injection without sanitization
- No execution outside orchestrated lifecycle

---

This agent governs the entire AI platform inside TextWash.

It ensures every intelligent action is:

- Validated
- Secured
- Metered
- Coordinated
- Logged
- Recoverable
- Scalable

It is the central nervous system of TextWash AI.
