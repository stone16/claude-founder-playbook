# Spec: Folding `The Founder's Playbook` PDF into MVP / Launch / Scale Stage Content

Date: 2026-05-28
Source: `reference/founders-playbook.pdf` (Anthropic, "The Founder's Playbook: Building an AI-Native Startup", 36 pages, May 2026)
Status: draft (planning — no code changes proposed in this doc)
Predecessor: `docs/spec-e2e-issues.md` (Issues 1–16; this spec extends Issue 13 — per-stage content — with concrete PDF-anchored material)

## Overview

The `founder-multistage` slice generalized the engine into a data-driven `stageRegistry`. `mvp`, `launch`, and `scale` are currently **defined-but-empty** placeholders (`required: []`, `recommended: []`, `gateCriteria: []`). This spec proposes the **content** that fills those slots, taking every decision from the PDF that this repo is implementing.

Each proposed addition cites the PDF page that justifies it. Anything not citable to the PDF is flagged as a **founder decision needed** — this doc does not invent product opinions.

## Reading guide

- **Cross-stage primitives (C1–C4)**: changes that touch the workspace `_reference/` tree or the engine outside any single stage. Do these first — they unlock cleaner per-stage adds.
- **Per-stage proposals (MVP / Launch / Scale)**: each section gives proposed `gateCriteria`, `required`, and `recommended` arrays with PDF citations, plus a content sketch for each artifact and the open decisions that block locking it in.
- **Schema impact callouts**: Scale needs a non-trivial schema extension; MVP and Launch fit the current registry shape.
- **Out of scope**: explicit list at the end so the next spec knows where to start.

---

## Part I — Cross-stage primitives

### C1 — Surfaces table is workspace-global, not Idea-only

**Source**: PDF p.6 (three Claude tool capabilities), p.11 (the Chat / Cowork / Code surfaces table).

**Current state**: `founder-journey/_reference/surfaces.md` already exists at workspace root (good). The Idea skill (`skills/founder-idea/SKILL.md:13`) is the only producer skill that references it. Every future stage skill should do the same.

**Proposal**:
1. Extend `_reference/surfaces.md` from the single table into a **per-stage role section**: which surface owns which work at Idea / MVP / Launch / Scale. The PDF gives explicit guidance:
   - Idea (p.11): Cowork for research/synthesis; Code only at the end for lightweight prototype.
   - MVP (p.17–18): Code becomes the primary build tool, anchored by a `CLAUDE.md` architectural context document; Cowork runs feedback logistics.
   - Launch (p.23–24): Code does audit/remediation + security; Cowork runs the ops layer (sprint cadence, bug triage, weekly metrics).
   - Scale (p.27–30): Cowork handles enterprise support / GTM logistics; Code hardens infra + builds demo environments + workflow lock-in integrations.
2. Every future per-stage SKILL.md opens with "Read `_reference/surfaces.md` before choosing a surface for the next step" — same pattern as `founder-idea/SKILL.md`.

**Files of interest**: `founder-journey/_reference/surfaces.md`, `templates/idea/_reference/surfaces.md` (template), each `skills/founder-*/SKILL.md`.

### C2 — "Claude as devil's advocate" is a cross-stage subroutine, not an Idea trick

**Source**: PDF p.10 ("Loss of objectivity"), p.12 ("Note: Using Claude as structured devil's advocate is a core use case at every stage of the AI startup life cycle"), p.13 (post-interview hypothesis-vs-anti-hypothesis split), p.17 ("pressure-test whether it's genuine signal from users or founder enthusiasm dressed up as product thinking"), p.19 ("ask Claude to make the adversarial case against your own traction").

**Current state**: `skills/founder-pressure-test/` exists but is filed under Idea producers. The PDF promotes the pattern to a cross-stage discipline.

**Proposal**:
- Either (a) rename `founder-pressure-test` to a cross-stage skill that every per-stage skill invokes at decision points, or (b) replicate the same prompt structure inside each per-stage skill. **Founder decision needed** between (a) and (b). PDF favors (a) — it explicitly names "every stage".
- Either way, each stage skill must include a "Before declaring this gate met, ask Claude to argue the opposite" checkpoint.

**Files of interest**: `skills/founder-pressure-test/`, future `skills/founder-mvp/`, `skills/founder-launch/`, `skills/founder-scale/`.

### C3 — Replace Issue 15's "killed/archived" with PDF-anchored "return to Idea"

**Source**: PDF p.20 (closing of Chapter 4): *"Let the answers determine whether you adjust, pivot, or **return to the Idea stage**."*

**Current state**: `docs/spec-e2e-issues.md` Issue 15 proposed a `killed`/`archived` terminal outcome, deferred to a follow-up spec.

**Proposal**: The PDF does not endorse a "killed" terminal state. Its vocabulary is **return to Idea** — i.e., a *stage transition backward*, not a terminal. This is a meaningfully different product decision and a meaningfully simpler schema change:
- No new terminal in `StageSchema`.
- Add a `returnToIdea(reason)` transition alongside `advanceStage`, which writes a `RETURN-<fromStage>.md` audit artifact (mirroring `OVERRIDE-<stage>.md`) and appends a `{from, reason, date, artifact}` entry to a `returns: []` log on the state file.
- `list` can show `kb-agent  idea (returned from mvp)  no gate`.

**Founder decision needed**: confirm the PDF reading. If the founder *does* want a hard "killed" outcome (e.g., for portfolio metrics), it is a deliberate extension of the PDF, not a faithful implementation.

**Files of interest**: `src/lib/transition.ts:35-37`, `src/schemas/state.ts`, `src/commands/advance.ts`.

### C4 — `_reference/resources.md` mirrors PDF Resources chapter

**Source**: PDF p.34–35 (Building with Claude / Founder stories / Startup support and opportunities).

**Proposal**: Add `_reference/resources.md` (workspace-level) carrying the PDF's resource lists verbatim with their links. Per-stage skills cite the relevant entries (e.g., MVP skill points at "Using CLAUDE.md files", "Claude Code best practices"; Scale skill points at "Anthropic Startups Program" + the founder stories about Carta Healthcare / Anything / Airtree as case studies for enterprise infra).

**Files of interest**: `founder-journey/_reference/resources.md`, `templates/_reference/resources.md` (template).

---

## Part II — MVP Stage content (PDF Chapter 4, p.15–20)

### Goal

PDF p.16: *"translate a validated problem into a working product that real users will actually use ... moving fast without accruing the type of technical debt that compounds ... investing in persistent context from day one."*

### Exit criteria (PDF verbatim, p.16)

*"The MVP stage exit condition is genuine evidence of product-market fit: proof that a specific, identifiable group of users has found the product valuable enough to return to it (retention), pay for it (revenue), or tell others about it (referral)."*

### Proposed `gateCriteria`

| Criterion key | PDF anchor | Question the GATE.md asks |
|---|---|---|
| `pmf_signal_present` | p.16 exit criteria; p.19 Sean Ellis test (>40% "very disappointed"); p.19 effort test | Do you have at least one quantified retention / revenue / referral signal that survives the adversarial case Claude can make against it? |
| `architecture_documented` | p.16 ("persistent context"); p.17 ("save this output as CLAUDE.md markdown file") | Does the workspace carry a `CLAUDE.md` capturing architectural decisions + a scope document, and does every Claude Code session start by revisiting them? |
| `security_reviewed_before_users` | p.18 ("Security review before any user touches it") | Has a security review (auth, sessions, data exposure, input validation, injection, deps) been run before the first real user, and have findings been triaged? |

### Proposed `required` artifacts (5)

| Artifact filename | PDF anchor | Content sketch |
|---|---|---|
| `architecture-decisions.md` | p.17 ("Define your architecture before you build" → "save this output as CLAUDE.md markdown file") | Patterns to follow, dependencies to avoid, tradeoffs accepted, constraints. The PDF explicitly says this file *is* the artifact ("the first artifact of your build"). |
| `mvp-scope.md` | p.17 ("Define and enforce your MVP scope"); p.18 (scope creep antidote) | What the product does, what it deliberately does **not** do, and the feature-amendment criteria (what evidence from real users would justify adding something). |
| `measurement-framework.md` | p.19 ("Build your measurement framework *before* launch"); p.19 Sean Ellis + effort tests | Retention benchmark, Day 7 / Day 30 targets, activation criteria, what false-positive PMF looks like, the Sean Ellis question wording. |
| `security-review.md` | p.18 ("Run a code-level security review with Claude before deploying to any real users") | First-pass review covering auth/session/data-exposure/input-validation/injection/deps with findings + triage decisions. |
| `feedback-synthesis.md` | p.19 ("Manage discovery and user feedback logistics" + weekly synthesis loop) | Bug intake template, weekly feedback synthesis cadence, last N weekly briefs. |

### Proposed `recommended` artifacts

- `pivot-diagnostic.md` — PDF p.20 gives the exact three-question diagnostic to run after three cycles without PMF movement. Optional artifact, blocking only if the founder declares "no signal yet" at gate time.
- `false-pmf-adversarial-case.md` — PDF p.19 ("ask Claude to make the adversarial case against your own traction: what would a skeptic say about these numbers?"). Captures Claude's strongest case that the early traction is *not* PMF.

### Open decisions

- **Sean Ellis threshold as criterion or as evidence**: PDF cites the 40% threshold as "a meaningful PMF indicator", not a hard rule. Default proposal: keep it as evidence inside `measurement-framework.md`, not as a hard-coded criterion key (which would make the engine opinionated about a number).
- **Pivot diagnostic placement**: required vs recommended. Default: recommended, escalated to required if `pmf_signal_present` is answered `false` at gate time.

---

## Part III — Launch Stage content (PDF Chapter 5, p.21–24)

### Goal

PDF p.21: *"If the MVP stage was about proving your product deserves to exist, the Launch stage is about proving your business deserves to grow ... build operational systems that free your attention for the decisions only a founder can make."*

### Exit criteria (PDF verbatim, p.22, numbered list)

1. *"Growth is repeatable and channel-driven. You're not just retaining users, you're acquiring them predictably through specific channels with understood unit economics: CAC, LTV, and payback period are numbers you know and can defend."*
2. *"The product can handle production workloads. Infrastructure is hardened, security and compliance are in order, and reliability holds under real production conditions."*
3. *"Operations run without founder bottlenecks. Processes exist and automation is in place. You are no longer the person personally handling support, triage, sprint planning, or reporting."*

### Proposed `gateCriteria`

The three keys map 1:1 to the PDF's numbered list:

| Criterion key | PDF anchor |
|---|---|
| `growth_repeatable_channel_driven` | p.22 exit criterion 1 |
| `production_workload_ready` | p.22 exit criterion 2; p.23 "Security and compliance are no longer deferrable" |
| `founder_not_bottleneck` | p.22 exit criterion 3; p.23 "The founder becomes the bottleneck" challenge |

### Proposed `required` artifacts (5)

| Artifact filename | PDF anchor | Content sketch |
|---|---|---|
| `growth-engine.md` | p.22 exit criterion 1 ("CAC, LTV, payback period are numbers") | Per-channel CAC, LTV, payback, conversion, retention by cohort. **Numeric, defensible.** |
| `tech-debt-audit.md` | p.23 ("Remediate technical debt before it compounds"); p.24 exercise (full architectural audit + prioritized remediation list) | Audit output from Claude Code, prioritized remediation list, "fix-before-next-release / can-wait-a-sprint / acceptable-ongoing-debt" buckets. |
| `security-compliance-review.md` | p.23 ("Security and compliance are no longer deferrable"); p.24 ("Make security and compliance a product workstream") + SOC 2 / GDPR / HIPAA examples | Target-market compliance frameworks identified, code-level review against them, prioritized remediation, docs/controls/audit-logging/access-management gap list. |
| `operations-handoff-map.md` | p.23 ("The founder becomes the bottleneck") + p.24 ("Build the systems that replace founder attention" exercise — categorize: automate / human-but-not-you / founder-judgment) | Inventory of every recurring task currently routed through the founder + its assigned category. |
| `product-management-system.md` | p.24 ("Stand up the product management processes you've been skipping" exercise — sprint cadence, spec template, bug triage decision tree, weekly metrics brief) | Sprint cadence document, spec template, bug-triage decision tree, weekly metrics brief template + data sources. |

### Proposed `recommended` artifacts

- `expansion-readiness.md` — PDF p.23 ("Expansion before you're ready" challenge). Optional artifact for founders contemplating a second market / second segment before Scale.

### Open decisions

- **What counts as "numbers you can defend" at Launch gate?** PDF leaves this to founder judgment. The engine cannot validate that CAC/LTV/payback are *correct*, only that they're *present*. Default: validator checks the artifact has non-empty entries for those three fields; the gate criterion's `answer: true` is a founder attestation.
- **Compliance framework specificity**: SOC 2 / GDPR / HIPAA are examples; not every Launch-stage company needs all three. Default: `security-compliance-review.md` includes a "target frameworks for our market" subsection; the artifact passes structural validation regardless of which frameworks the founder names.

---

## Part IV — Scale Stage content (PDF Chapter 6, p.25–30) — needs schema extension

### Goal

PDF p.26: *"build systematic growth that's sustained by mature organizational operations ... build a defensible moat through accumulated depth, stemming from the expertise you've built into your product, your product's depth of integration with the other tools and platforms your users rely on, and the proprietary system data and workflows."*

### Exit condition (PDF, p.26) — **not a single gate**

The PDF explicitly says Scale's exit is a **threshold event**, not a single milestone, and lands in **one of three forms**:
1. Sustainable profitability at a scale that no longer requires external capital
2. IPO-readiness
3. Acquisition

All three require: *systematic and auditable growth, product moat that holds under scrutiny, operationally mature organization.*

### Schema impact (must be planned before content)

The current `gateCriteria: string[]` shape **cannot directly express "three branching exit paths"**. Two viable options:

- **Option A (minimal)**: keep `gateCriteria` as the three *common* requirements (moat / governance / scrutiny-ready) + add a required artifact `exit-path.md` whose frontmatter declares `exitPath: "profitability" | "ipo" | "acquisition"`. The engine treats the gate as "common criteria met AND exit path declared". This is the lowest-cost change.
- **Option B (structural)**: extend `StageDefinition` with an optional `exitBranches` array, each with its own criteria set. Validator selects the branch by `exit-path.md`'s declared path. More expressive, larger surface area.

**Founder decision needed**: A or B. Default proposal: **Option A** — Scale is not the place to relitigate the schema; the three exit forms differ in evidence content more than in gate logic.

### Proposed `gateCriteria` (common across all three exit forms)

| Criterion key | PDF anchor |
|---|---|
| `defensible_moat_established` | p.26 ("build a defensible moat through accumulated depth"); p.29 data-flywheel section; p.30 workflow lock-in |
| `org_governance_mature` | p.26 ("organizational governance and compliance infrastructure that satisfies the most demanding external reviewers"); p.27 ("scaling organizational functions") |
| `external_scrutiny_ready` | p.26 ("If a well-funded incumbent copied your product today, would your users stay?"); p.27 ("public investors, analysts, regulators, enterprise procurement teams, and acquirers apply greater pressure") |

### Proposed `required` artifacts

| Artifact filename | PDF anchor | Content sketch |
|---|---|---|
| `exit-path.md` | p.26 (three exit forms) | Founder declares which path (`profitability` / `ipo` / `acquisition`) + the milestones and metrics for that specific path. |
| `moat-narrative.md` | p.29 (compounding data + skills) + p.30 (workflow lock-in) | The one-page moat story: data flywheel, integration depth, workflow lock-in, "why a well-resourced competitor starting today couldn't replicate this in under two years". |
| `gtm-engine.md` | p.27 ("Building a GTM function"); p.28–29 ("Build a real GTM function" exercises) | Market segmentation, messaging architecture, analyst-relations strategy, sales playbooks, investor-facing metrics narrative. |
| `enterprise-readiness.md` | p.28 ("Scale technical operations into enterprise-grade infrastructure"); p.27 ("multi-year contracts ... response times and documentation") | SLAs, support infra, incident response runbooks, observability layer, documentation depth. |
| `org-governance.md` | p.27 ("Scaling organizational functions" — hiring, payroll, accounting, legal); p.26 ("organizational governance and compliance infrastructure") | Hiring rubric, finance/accounting cadence, legal/contract pipeline, compliance posture per target market. |

### Proposed `recommended` artifacts

- `workflow-lock-in-audit.md` — PDF p.30 exercise (integration depth per customer + switching-cost estimate per segment).
- `domain-knowledge-skill-pack.md` — PDF p.29 ("Externalizing your domain knowledge with Claude becomes invaluable" — codifying recurring workflows into Skills the product depends on).

### Open decisions

- **Schema option A vs B**: see callout above.
- **Is Scale terminal?** PDF treats it as a threshold event. `stageOrder.ts` has `scale` as the last entry with no successor; `advanceStage` from scale already throws `TerminalStageTransitionError`. Default: keep it terminal; the three exit forms are *content variations within Scale*, not a new stage.
- **Templates for Scale**: PDF gives less template-able content for Scale than for MVP/Launch (it's narrative-heavy: moat story, governance posture). Default: provide skeletons but accept that Scale artifacts will be more bespoke than Idea's.

---

## Part V — Summary table

| # | Addition | PDF anchor | Schema impact | Engine impact | Out-of-scope of this spec |
|---|---|---|---|---|---|
| C1 | Surfaces table → cross-stage role section | p.6, p.11 | None | None | — |
| C2 | Devil's advocate as cross-stage subroutine | p.10, p.12, p.13, p.17, p.19 | None | Skill restructure | Implementation choice (a/b) |
| C3 | Return-to-Idea transition (vs Issue 15 kill/archive) | p.20 | Add `returns: []` log to state | New transition fn | Validator/reporter wiring |
| C4 | `_reference/resources.md` | p.34–35 | None | None | — |
| MVP-1 | `gateCriteria`: pmf_signal_present, architecture_documented, security_reviewed_before_users | p.16, p.17, p.18, p.19 | Registry data | None | Sean Ellis as criterion (deferred — keep as evidence) |
| MVP-2 | 5 required artifacts (architecture-decisions, mvp-scope, measurement-framework, security-review, feedback-synthesis) | p.17–19 | Registry data | None | Skill content |
| MVP-3 | Recommended: pivot-diagnostic, false-pmf-adversarial-case | p.19, p.20 | Registry data | None | — |
| LAU-1 | `gateCriteria`: growth_repeatable_channel_driven, production_workload_ready, founder_not_bottleneck | p.22 | Registry data | None | — |
| LAU-2 | 5 required artifacts (growth-engine, tech-debt-audit, security-compliance-review, operations-handoff-map, product-management-system) | p.22–24 | Registry data | None | Skill content |
| LAU-3 | Recommended: expansion-readiness | p.23 | Registry data | None | — |
| SCA-1 | `gateCriteria` (common): defensible_moat_established, org_governance_mature, external_scrutiny_ready | p.26, p.27, p.29, p.30 | Registry data | None | — |
| SCA-2 | 5 required artifacts (exit-path, moat-narrative, gtm-engine, enterprise-readiness, org-governance) | p.26–30 | **Option A schema extension** to artifact frontmatter (`exitPath` field) | Validator reads `exitPath` from `exit-path.md` | Option B branching schema |
| SCA-3 | Recommended: workflow-lock-in-audit, domain-knowledge-skill-pack | p.29, p.30 | Registry data | None | — |

---

## Part VI — Implementation order (proposed)

This spec deliberately does **not** propose a single mega-PR. The PDF maps to roughly four independent units of work:

| Order | Unit | Why this order |
|---|---|---|
| 1 | C1 + C4 (workspace `_reference/` updates) | Low risk; unlocks per-stage skills referencing them; no schema change |
| 2 | MVP four-pack (registry data + templates + skill + tests + e2e extension) | Highest user value: unlocks the second stage end-to-end with PDF backing |
| 3 | C2 (devil's-advocate skill restructure) + C3 (return-to-Idea transition) | Touches multiple skills + state machine; safer once MVP is real content to reference |
| 4 | Launch four-pack | Mirrors MVP unit; benefits from any patterns established there |
| 5 | Scale four-pack (with Option A schema extension) | Last because it requires the only schema change |

Each unit is a candidate for its own `.harness/<task>/spec.md`. This document is the *content source*; per-unit specs translate the relevant rows into checkpoints + acceptance criteria, following the `founder-multistage` precedent.

---

## Part VII — Out of scope (explicit)

- Per-stage **skill content** (the SKILL.md prose, agent definitions, dialogue patterns) — only the registry + artifact templates are scoped here. Skills follow per-stage specs.
- Issue 15's `killed`/`archived` terminal — replaced by C3 ("return to Idea"). If the founder later wants a true kill outcome, it's a separate spec.
- Workspace-level concerns flagged in the prior repo audit: missing root README, `dist/` committed to repo, `.harness/retro/` untracked. These are hygiene, not stage content.
- Anything not citable to the PDF. Founder decisions are flagged in each section's "Open decisions"; this spec does not silently insert opinions.

---

## Part VIII — Verification gate for this spec

A spec is ready to translate into per-unit harness tasks when:

- [ ] Every "Open decision" above is closed (founder picks A/B, sets defaults, or accepts the proposed default).
- [ ] C1's per-stage surfaces section is drafted and reviewed against PDF p.11 / p.17 / p.23 / p.27 for fidelity.
- [ ] The Scale schema choice (Option A vs B) is committed in writing.
- [ ] The order of units (Part VI) is confirmed or reordered.

Once those four are answered, each row in Part V's summary table becomes a single checkpoint or small group of checkpoints inside a per-unit harness spec, anchored to the cited PDF page so future review-loop iterations cannot drift from the source.

---

## Appendix A — PDF page → repo addition index

For quick reverse lookup when reading the PDF.

| PDF p. | Section | Repo addition |
|---|---|---|
| p.6 | AI tool capabilities | C1 surfaces |
| p.10 | Loss of objectivity | C2 devil's advocate |
| p.11 | Surfaces table | C1 surfaces |
| p.12 | "structured devil's advocate is a core use case at every stage" | C2 |
| p.13 | Hypothesis-vs-anti-hypothesis split | C2 |
| p.16 | MVP exit criteria + persistent context | MVP-1, MVP-2 (`architecture-decisions`) |
| p.17 | Architecture + scope; CLAUDE.md as artifact | MVP-1, MVP-2 |
| p.18 | Security review before any user | MVP-1, MVP-2 (`security-review`) |
| p.19 | Measurement framework before launch; Sean Ellis; feedback synthesis | MVP-1, MVP-2 (`measurement-framework`, `feedback-synthesis`), MVP-3 |
| p.20 | "Return to the Idea stage" + pivot diagnostic | C3, MVP-3 |
| p.22 | Launch exit criteria (numbered) | LAU-1 |
| p.23 | Tech debt + founder bottleneck + security/compliance | LAU-2 |
| p.24 | PM system exercise | LAU-2 (`product-management-system`) |
| p.26 | Scale exit threshold + three forms; moat; external scrutiny | SCA-1, SCA-2 (`exit-path`, `moat-narrative`) |
| p.27 | Scaling org functions; enterprise readiness | SCA-2 (`org-governance`, `enterprise-readiness`) |
| p.28–29 | GTM function | SCA-2 (`gtm-engine`) |
| p.29 | Compounding data; domain-knowledge skills | SCA-1, SCA-3 |
| p.30 | Workflow lock-in | SCA-1, SCA-3 |
| p.34–35 | Resources | C4 |
