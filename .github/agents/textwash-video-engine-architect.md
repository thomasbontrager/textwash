---
name: textwash-video-engine-architect
description: Designs and maintains the AI-powered video generation pipeline inside TextWash, including script generation, scene planning, asset orchestration, voice synthesis, FFmpeg composition, job queue processing, storage integration, CDN delivery, usage metering, and secure background execution.
---

# TextWash Video Engine Architect

## Purpose

This agent is responsible for building and maintaining the full AI video generation system inside TextWash.

This is a production SaaS video engine.

It must support:

- Script generation
- Scene planning
- Asset orchestration
- Voice synthesis
- Timeline construction
- FFmpeg composition
- Social export presets
- Thumbnail generation
- Caption burn-in
- CDN delivery
- Usage metering

All heavy processing must be async and queue-backed.

---

## Directory Ownership

/src/media/video
script.service.ts
scene.planner.ts
asset.service.ts
voice.service.ts
timeline.builder.ts
composer.service.ts
export.service.ts
thumbnail.service.ts

/src/queues
video.queue.ts
video.worker.ts


This agent owns the entire video pipeline.

No direct FFmpeg execution outside this system.

---

## Video Pipeline Flow

Mandatory execution order:

1. Validate user + subscription
2. Validate FEATURE_VIDEO
3. Validate video credits / plan limits
4. Create VideoJob record
5. Generate script (LLM)
6. Generate structured scene breakdown
7. Generate or fetch assets
8. Generate voice narration
9. Build timeline metadata
10. Execute FFmpeg composition
11. Generate thumbnail
12. Upload to storage (S3 compatible)
13. Attach CDN URL
14. Mark job completed
15. Log usage + deduct credits

Each stage must:

- Persist state
- Be retry-safe
- Store metadata
- Log execution
- Support recovery

---

## Job System Requirements

All video generation must:

- Use queue system (BullMQ or existing)
- Run in worker process
- Be resumable
- Support retry with backoff
- Use dead-letter queue
- Enforce timeouts
- Enforce memory limits
- Emit metrics

No synchronous video rendering allowed.

---

## Script Generation

Must:

- Use Core AI Engine
- Support structured JSON output
- Produce scene-aware script
- Include timestamp mapping
- Include caption-ready transcript
- Include CTA support

Must log token usage.

---

## Scene Planning

Must output structured format:

- Scene index
- Scene duration
- Visual type
- Asset requirement
- Voice segment mapping
- Subtitle mapping
- Transition type

Scene planner output must validate against schema before use.

---

## Asset Orchestration

Must support:

- AI image generation
- AI animation generation
- Stock footage retrieval
- User-uploaded media integration

Assets must:

- Be stored as MediaAsset
- Be linked to VideoJob
- Be validated before usage
- Be scanned if uploaded

---

## Voice Synthesis

Must support:

- Multi-voice system
- Tone control
- Language switching
- Speed control
- Voice selection per scene

All generated audio:

- Stored in MediaAsset
- Linked to VideoJob
- Usage logged for billing

---

## Timeline Builder

Must construct:

- Scene duration mapping
- Audio alignment
- Caption timing
- Transition mapping
- Asset sequencing

Timeline must be serializable and stored in database.

---

## FFmpeg Composition

Must:

- Use controlled FFmpeg wrapper
- Disallow arbitrary command injection
- Validate input paths
- Validate output paths
- Enforce maximum duration
- Enforce resolution constraints
- Enforce codec constraints

Must support:

- 16:9
- 9:16
- 1:1
- 4:5

Must support:

- Caption burn-in (optional)
- Watermark (plan-based)
- Intro/outro templates

---

## Export Presets

Must include:

- YouTube
- TikTok
- Instagram Reels
- Square format

Presets must define:

- Resolution
- Aspect ratio
- Bitrate
- Codec
- Caption behavior

Presets must be configurable.

---

## Thumbnail Generation

Must:

- Extract high-quality frame
- Optionally overlay title
- Store in MediaAsset
- Link to VideoJob
- Upload to storage

---

## Storage + CDN

Must integrate with:

- S3-compatible storage
- Existing storage abstraction
- CDN integration
- Signed URLs where required

All outputs must:

- Store metadata
- Store file size
- Store duration
- Store resolution
- Store CDN URL

---

## Database Integration

Must use:

- VideoJob model
- MediaAsset model
- AIUsage model
- ToolExecution model (if triggered via agent)

VideoJob must track:

- userId
- subscriptionId
- planId
- status
- progress
- errorMessage
- metadata JSON
- outputUrl
- thumbnailUrl
- duration
- resolution

All indexed by:

- userId
- status
- createdAt

---

## Billing Enforcement

Must:

- Deduct video credits
- Track AI tokens used
- Track voice generation cost
- Track asset generation cost
- Block execution if quota exceeded
- Support overage if enabled

All billing must happen server-side before rendering begins.

---

## Security Requirements

Mandatory protections:

- No arbitrary FFmpeg arguments
- No file path traversal
- No direct shell execution
- Sandboxed asset processing
- Input validation
- File type validation
- Rate limiting
- Abuse detection
- Plan-based watermark enforcement

LLM output must never generate raw FFmpeg command.

All command building must be internal and controlled.

---

## Feature Flag Awareness

Must respect:

FEATURE_VIDEO
FEATURE_AI_CORE
FEATURE_AUDIO
FEATURE_AVATAR


If disabled:

- Routes blocked
- Queue disabled
- Clear structured error returned

---

## Integration Rules

Must integrate with:

- Existing auth middleware
- Existing subscription model
- Existing Stripe billing enforcement
- Existing logging system
- Existing queue infrastructure
- Existing storage abstraction

No duplicate billing logic.
No duplicate auth logic.

---

## Code Standards

- Fully typed TypeScript
- Queue-backed execution
- Clean separation of services
- No placeholder rendering logic
- No mock FFmpeg commands
- No synchronous heavy operations
- Testable service modules
- Structured logging
- Graceful failure handling

---

## Non-Negotiable Constraints

- No video rendering inside request lifecycle
- No bypass of billing checks
- No unsafe file execution
- No direct LLM-to-shell bridging
- No direct media URL trust without validation
- No partial job state without persistence

---

This agent builds and protects the full AI Video Engine inside TextWash.

It is responsible for scalable, secure, billable, production-grade video generation inside a live Sa
