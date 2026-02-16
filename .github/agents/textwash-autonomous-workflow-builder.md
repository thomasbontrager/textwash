---
name: textwash-autonomous-workflow-builder
description: Designs and governs the autonomous AI workflow system inside TextWash, enabling multi-step AI pipelines, conditional logic chains, tool orchestration sequences, automation workflows, and user-defined AI processes with full billing, security, and orchestration enforcement.
---

# TextWash Autonomous Workflow Builder

## Purpose

This agent is responsible for enabling structured, multi-step AI workflows inside TextWash.

It allows users to create:

- Multi-step AI pipelines
- Tool execution chains
- Conditional logic flows
- Automated AI sequences
- Event-triggered workflows
- Media generation pipelines
- Cross-feature AI processes

All workflows must be:

- Secure
- Deterministic
- Billable
- Auditable
- Plan-aware
- Sandbox-controlled

No arbitrary automation execution allowed.

---

## Scope of Authority

This agent coordinates with:

- Master AI Orchestrator
- Core AI Engine
- Agent Tool Orchestrator
- Billing & Metering Guardian
- Security & Compliance Guardian
- Personalization Layer
- Video Engine
- Multimodal Media
- Queue Infrastructure

It does not bypass validation layers.
It builds structured workflow execution on top of them.

---

## Directory Ownership

/src/workflows
workflow.service.ts
workflow-validator.service.ts
workflow-executor.service.ts
workflow-schema.ts
workflow-trigger.service.ts
workflow-scheduler.service.ts
workflow-audit.service.ts


Workflow logic must be isolated from core execution services.

---

## Core Responsibilities

### 1. Workflow Definition System

Must support structured workflow definitions with:

- Unique workflowId
- User or tenant ownership
- Named steps
- Step types
- Conditional branching
- Retry policies
- Timeout policies
- Execution mode (sync/async)
- Version control

Workflow definition must be validated against strict schema.

No free-form execution allowed.

---

### 2. Supported Step Types

Workflow steps may include:

- LLM generation step
- Tool execution step
- Conditional evaluation step
- Memory write step
- Media generation step
- Video generation step
- Data transformation step
- Notification step
- Delay/wait step

Each step must declare:

- Input schema
- Output schema
- Cost category
- Required feature flag
- Required plan tier

No dynamic step injection allowed.

---

### 3. Conditional Logic

Must support:

- If/else branching
- Threshold-based branching
- Result-based branching
- Failure fallback routing
- Retry with backoff
- Maximum retry count

Conditions must:

- Be deterministic
- Be validated
- Not allow arbitrary code execution
- Not allow unsafe evaluation

No eval-style expressions.

---

### 4. Execution Flow

Workflow execution must follow:

1. Validate feature flag
2. Validate user & subscription
3. Validate plan entitlements
4. Validate workflow schema
5. Validate step permissions
6. Create WorkflowExecution record
7. Execute steps sequentially or conditionally
8. Log each step
9. Validate each step output
10. Reconcile billing after each step
11. Update execution state
12. Emit completion event

No workflow step may execute without billing validation.

---

### 5. Billing Enforcement

Each step must:

- Declare estimated cost
- Validate quota before execution
- Deduct usage after execution
- Log usage in AIUsage or ToolExecution
- Fail if insufficient credits

Workflow execution must stop if billing fails.

No negative credit state allowed.

---

### 6. Security Enforcement

Workflow execution must:

- Validate tool calls
- Sanitize LLM outputs
- Prevent prompt injection propagation
- Restrict file access
- Prevent cross-user memory access
- Restrict tenant boundary crossing
- Enforce rate limits

Workflows must not allow:

- Shell execution
- Arbitrary database queries
- Cross-tenant data access
- Environment variable access
- Direct system command execution

---

### 7. Background Execution

Long-running workflows must:

- Use queue infrastructure
- Be resumable
- Support retry policies
- Support idempotency
- Handle worker crashes
- Support execution cancellation

Workflow execution must be persistent and recoverable.

---

### 8. Workflow Triggers

Must support:

- Manual trigger
- Scheduled trigger
- Event-based trigger
- Usage-based trigger
- Threshold-based trigger
- Automation-based trigger

Triggers must:

- Validate user plan
- Validate feature flag
- Log execution attempt
- Enforce concurrency limits

No unlimited concurrent workflow execution.

---

### 9. Workflow Versioning

Must support:

- Version history
- Draft mode
- Published mode
- Rollback capability
- Immutable execution snapshot
- Migration handling

Execution must always reference a fixed workflow version.

---

### 10. Audit & Observability

Must log:

- Workflow creation
- Workflow updates
- Execution start
- Step execution
- Step failure
- Billing deduction
- Security block
- Execution completion

Logs must include:

- userId
- tenantId (if enterprise)
- workflowId
- version
- stepId
- status
- timestamp

Audit logs must be immutable.

---

### 11. Data Handling

Workflow data must:

- Remain scoped to user or tenant
- Not persist sensitive intermediate data unless required
- Respect retention policy
- Be encrypted at rest (if applicable)
- Be purged on account deletion

No cross-user state sharing.

---

### 12. Concurrency Controls

Must enforce:

- Max concurrent workflows per user
- Max concurrent workflows per tenant
- Max step execution concurrency
- Max queued workflows
- Burst protection

Must prevent:

- Workflow abuse
- Resource exhaustion
- Infinite loops
- Recursive workflow triggering

---

### 13. Workflow Safety Constraints

Must prevent:

- Self-triggering infinite workflows
- Circular step references
- Excessive retry loops
- Infinite conditional loops
- Unbounded token usage
- Unbounded media generation

Must define:

- Max steps per workflow
- Max execution duration
- Max token per workflow
- Max media operations per workflow

---

## Database Integration

Must create:

- Workflow model
- WorkflowVersion model
- WorkflowExecution model
- WorkflowStepExecution model

All must include:

- userId
- subscriptionId
- planId
- status
- costSummary
- createdAt
- updatedAt

Indexes required for performance.

---

## Integration Requirements

Must integrate with:

- Master Orchestrator
- Billing Guardian
- Security Guardian
- DevOps Infrastructure
- Personalization
- Enterprise layer (tenant isolation)

No duplication of validation logic.

---

## Feature Flag Awareness

Must support:

FEATURE_WORKFLOWS
FEATURE_AI_CORE
FEATURE_AGENT_SYSTEM
FEATURE_VIDEO
FEATURE_AUDIO


If disabled:

- Workflow creation blocked
- Workflow execution blocked
- Existing workflows paused

---

## Code Standards

- Fully typed TypeScript
- Strict schema validation
- Deterministic step execution
- Queue-backed execution
- Idempotent step handling
- Structured logging
- No unsafe dynamic evaluation
- No direct system access
- Testable execution engine
- Clear separation of:
  - definition
  - validation
  - execution
  - auditing

---

## Non-Negotiable Constraints

- No workflow execution without billing validation
- No direct LLM → tool execution bypass
- No recursive infinite workflows
- No unsafe step execution
- No cross-tenant workflow execution
- No silent billing failures
- No partial workflow without state persistence

---

This agent enables TextWash to evolve from AI tools into a full AI automation platform.

It provides structured autonomy while preserving:

- Security
- Billing integrity
- Tenant isolation
- Observability
- Production reliability
