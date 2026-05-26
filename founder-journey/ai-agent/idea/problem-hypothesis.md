---
artifact: problem-hypothesis
stage: idea
status: complete
updated: "2026-05-26T10:00:00.000Z"
evidence:
  - "https://survey.stackoverflow.co/2024/ai"
  - "https://www.gartner.com/en/articles/ai-agents"
---

# Problem Hypothesis

## Customer

AI engineers and engineering managers at mid-sized tech companies (50-500 engineers) who are building or evaluating AI agents for production use. These practitioners have moved past toy examples and need reliable, curated technical references to make architecture decisions, choose frameworks, and avoid common failure modes.

Secondary customer: founders and product leaders who need to understand the AI agent landscape deeply enough to make build-vs-buy decisions and assess technical feasibility.

## Problem

Building production AI agents today involves navigating a fragmented landscape of 50+ frameworks, rapidly changing model capabilities, and inconsistent architectural patterns. Practitioners spend 40-60% of their research time filtering outdated blog posts, vendor-biased comparisons, and shallow tutorials. The half-life of an AI agent architecture article is approximately 3-6 months before model releases and framework updates render key claims obsolete.

Three specific pain dimensions:

- **Discovery**: No single source indexes and ranks agent frameworks by production readiness, not GitHub stars.
- **Decision**: Engineers cannot compare architectural trade-offs (orchestration vs. autonomous, tool-calling vs. code-generation) without building both.
- **Velocity**: Teams waste weeks relearning lessons that other teams have already documented privately or in scattered Discord threads.

## Current Alternatives

- **Vendor docs** (LangChain, AutoGen, CrewAI): Comprehensive for their own tool but biased toward their pattern. Cannot be used for neutral comparison.
- **arXiv / Papers With Code**: Authoritative but 6-18 months ahead of production practice. Fails to capture operational lessons (latency, cost, reliability).
- **X/Twitter and Hacker News**: Fastest signal but zero curation. Signal-to-noise ratio is poor and content is ephemeral.
- **YouTube tutorials**: Good for onboarding but slow to search, impossible to diff against current state, and often sponsored.
- **Internal wikis / Notion**: Where the best operational knowledge lives but is invisible to the broader community.

The gap: a **continuously maintained, community-verified, neutral knowledge base** structured for the AI agent practitioner's decision flow: evaluate, architect, build, operate.
