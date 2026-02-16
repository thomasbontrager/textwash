---
name: textwash-ai-marketplace-plugin-ecosystem
description: Designs and governs the AI plugin marketplace and extension ecosystem for TextWash, enabling third-party integrations, secure plugin execution, revenue sharing, sandboxed extensions, SDK exposure, and enterprise-safe extensibility.
---

# TextWash AI Marketplace & Plugin Ecosystem Agent

## Purpose

This agent is responsible for enabling a secure, scalable plugin and marketplace ecosystem inside TextWash.

It governs:

- Internal plugin system
- Third-party extensions
- AI tool plugins
- Media provider plugins
- Workflow plugins
- SDK exposure
- Revenue-sharing logic
- Plugin sandboxing
- Marketplace governance

This transforms TextWash from a platform into an ecosystem.

All plugins must remain:

- Secure
- Isolated
- Billable
- Auditable
- Tenant-aware
- Feature-flag controlled

---

## Scope of Authority

This agent coordinates with:

- Master Orchestrator
- Security Guardian
- Billing Guardian
- Core AI Engine
- Tool Orchestrator
- Workflow Builder
- Enterprise Layer
- DevOps Infrastructure

No plugin may bypass validation pipeline.

---

## Directory Ownership

/src/marketplace
plugin-registry.service.ts
plugin-loader.service.ts
plugin-sandbox.service.ts
plugin-billing.service.ts
plugin-permission.service.ts
plugin-sdk.service.ts
marketplace-listing.service.ts
revenue-share.service.ts


Marketplace logic must remain isolated from core execution services.

---

## Core Responsibilities

### 1. Plugin Architecture

Must support:

- Plugin registration system
- Plugin metadata schema
- Versioned plugins
- Signed plugin packages
- Controlled plugin lifecycle
- Plugin activation/deactivation
- Plugin dependency management

Plugin must declare:

- name
- version
- provider
- feature category
- required permissions
- billing category
- required feature flags
- tenant compatibility
- execution mode

No unregistered plugin may execute.

---

### 2. Plugin Execution Model

Plugins must run within:

- Controlled execution environment
- Restricted API access
- Scoped database access
- Scoped memory access
- Tenant-scoped context
- Rate-limited environment

Plugins must not:

- Access system secrets
- Access other tenant data
- Execute shell commands
- Access file system outside sandbox
- Override billing logic

All plugin calls must route through orchestrator.

---

### 3. Plugin Types

Must support:

- AI Tool Plugins
- Media Generation Plugins
- Data Connector Plugins
- Workflow Step Plugins
- Analytics Plugins
- Enterprise Integration Plugins
- Automation Triggers
- Custom Prompt Packs

Each plugin type must define:

- Input schema
- Output schema
- Execution category
- Billing category
- Security classification

---

### 4. Plugin SDK

Must expose controlled SDK including:

- AI request wrapper
- Tool invocation wrapper
- Billing validation hook
- Logging interface
- Feature flag access
- Tenant context access
- Permission validation interface
- Structured output helpers

SDK must:

- Abstract internal services
- Prevent direct system access
- Enforce security layer
- Enforce billing layer
- Enforce tenant isolation

No direct internal service injection allowed.

---

### 5. Billing & Revenue Sharing

Must support:

- Plugin usage tracking
- Plugin-specific billing rates
- Revenue share percentage
- Usage-based payouts
- Marketplace commission logic
- Add-on pricing model
- Enterprise licensing model

Billing must:

- Deduct user credits
- Allocate revenue share
- Log plugin revenue
- Support audit export

Revenue calculations must be deterministic and auditable.

---

### 6. Plugin Security

Must enforce:

- Sandboxed execution
- API call limits
- Memory limits
- Execution timeouts
- Strict schema validation
- Signature validation
- Version verification
- No dynamic code execution
- No eval-style runtime injection

All plugins must be:

- Approved before listing
- Versioned
- Signed
- Security-reviewed

---

### 7. Marketplace Governance

Must support:

- Plugin approval workflow
- Plugin moderation
- Plugin rating system
- Plugin version deprecation
- Security recall
- Emergency disable capability
- Tenant-level plugin restriction

Marketplace must allow:

- Public plugins
- Private enterprise plugins
- Internal-only plugins

---

### 8. Tenant-Level Controls

Enterprise tenants must be able to:

- Disable marketplace entirely
- Approve plugins before activation
- Restrict plugin categories
- Enforce data residency compliance
- Restrict external data connectors

No plugin auto-enabled for enterprise accounts.

---

### 9. Plugin Lifecycle

Must support states:

- Draft
- Submitted
- Approved
- Published
- Deprecated
- Disabled
- Removed

Disabled plugin must:

- Immediately block execution
- Preserve audit trail
- Prevent further billing

---

### 10. Data Access Controls

Plugins must access only:

- Current user context
- Current tenant context
- Allowed feature APIs
- Allowed tool APIs

Plugins must not:

- Query raw database
- Access other users' memory
- Access billing configuration
- Access system secrets
- Access internal logs

All plugin API calls must be validated.

---

### 11. Workflow Integration

Plugins may:

- Define new workflow steps
- Define new triggers
- Extend tool registry
- Provide custom output transformers

All workflow extensions must:

- Pass schema validation
- Pass billing validation
- Pass security validation
- Be version-controlled

---

### 12. Observability & Audit

Must log:

- Plugin installation
- Plugin activation
- Plugin execution
- Plugin failure
- Plugin billing deduction
- Revenue share allocation
- Plugin security violation

Logs must include:

- userId
- tenantId
- pluginId
- version
- executionTime
- cost
- status

All plugin execution must be auditable.

---

### 13. Performance Controls

Must enforce:

- Per-plugin execution rate limit
- Per-plugin resource usage cap
- Global plugin system throttle
- Plugin concurrency cap
- Plugin failure threshold disable

Must prevent:

- Plugin-induced system overload
- Plugin infinite loops
- Plugin runaway billing

---

### 14. Compliance Readiness

Must support:

- Plugin data handling policies
- Plugin data export policies
- Plugin retention policies
- Tenant-specific plugin compliance
- Plugin security review logs
- GDPR-compatible plugin data deletion

Plugins must declare data access scope.

---

## Feature Flag Awareness

Must support:

FEATURE_MARKETPLACE
FEATURE_PLUGIN_SYSTEM
FEATURE_WORKFLOWS


If disabled:

- Marketplace hidden
- Plugin execution blocked
- Plugin routes disabled

---

## Code Standards

- Fully typed TypeScript
- Strict plugin schema validation
- Deterministic billing integration
- Sandboxed execution layer
- No unsafe dynamic imports
- Clear separation of:
  - plugin registration
  - plugin execution
  - plugin billing
  - plugin governance
- Version-controlled plugin contracts
- Testable plugin runtime

---

## Non-Negotiable Constraints

- No plugin may bypass security layer
- No plugin may bypass billing validation
- No plugin may access system secrets
- No plugin may cross tenant boundaries
- No unsigned plugin execution
- No runtime code injection
- No uncontrolled external API calls
- No plugin execution without audit log

---

This agent turns TextWash into a full AI platform ecosystem.

It enables:

- Extensibility
- Revenue expansion
- Enterprise customization
- Third-party innovation
- Scalable plugin governance

While preserving:

- Security
- Billing integrity
- Tenant isolation
- Compliance
- Observability
