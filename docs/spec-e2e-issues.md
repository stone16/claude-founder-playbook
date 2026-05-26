# Spec: End-to-End Validation Issues

Date: 2026-05-26
Source: Full workflow walkthrough (AI Agent 知识库 example) + Review Loop with Codex

## Overview

Ran the founder idea workflow end-to-end: `init → new → fill artifacts → status → check → advance`, plus a 3-round Review Loop with Codex. The CLI harness passed all 122 existing tests, and the workflow completed successfully. Six issues were identified — four in the harness and two in the data model.

---

## Issue 1: Active Idea Caching Pollutes Test Environment

**Severity**: major
**Source**: `src/lib/active.ts:13-42`, `test/cli.test.ts:41-47`

### What happened

When `founder new` creates an idea, it writes the slug to `<workspace>/.active` via `setActiveIdea()`. Subsequent commands (`status`, `check`, `advance`) read this file via `readActiveIdea()` and use the cached slug when none is passed explicitly.

The test `returns non-zero when advance has no idea selection` (cli.test.ts:41) calls `main(["advance"])` without a `--workspace` flag. Since the test runs against the project's default workspace (`./founder-journey`), it reads the real `.active` file left by the prior demo workflow. This causes the test to unexpectedly advance `ai-agent` from mvp to launch instead of failing with `MISSING_IDEA_SELECTION`.

### Root cause

Two things compound:
1. Tests share the default workspace directory with manual CLI usage — no test isolation.
2. `writeFile` in `setActiveIdea` is not mocked in the test, so it persists across test runs.

### Proposed fix

- Option A (minimal): Delete `.active` in the test's `afterEach` if the test suite owns the workspace.
- Option B (better): Tests should pass `--workspace <tmpdir>` via `FOUNDER_JOURNEY` env var or argv to isolate from manual state. The `WorkspaceResolutionInput` already supports `env` override — expose this in `main()`.
- Option C (structural): Make `main()` accept a `WorkspaceResolutionInput` parameter so tests can inject a temp workspace without touching env.

### Related files

- `src/lib/active.ts` — `setActiveIdea`, `readActiveIdea`
- `src/lib/paths.ts` — `resolveWorkspaceRoot`, `WorkspaceResolutionInput`
- `src/cli.ts:31` — `main()` signature
- `test/cli.test.ts:41-47` — affected test

---

## Issue 2: Non-Idea Stages Have No Gate Validation

**Severity**: major
**Source**: `src/lib/validate.ts:271-278`

### What happened

`validateIdeaStage()` has an early return for non-idea stages:

```ts
if (stage !== "idea") {
    return {
      ok: issues.length === 0,
      ideaSlug,
      stage,
      issues,
    };
  }
```

This means `founder advance` from mvp → launch (or launch → scale) succeeds trivially — as long as the stage directory exists and state.json is valid, no artifact or gate checks are performed. During the e2e test, `ai-agent` was accidentally advanced from mvp → launch with zero validation.

### Is this intended?

Partially — the current slice is scoped to the Idea stage. The `stageManifest` only defines `idea` (src/stages/idea.ts), and the `GateSchema` criteria names (`problem_real_specific`, `solution_addresses_actual_problem`, `enough_signal_to_build`) are Idea-specific. The harness doesn't yet have stage manifests or gate schemas for mvp/launch/scale.

However, the advance command (`src/commands/advance.ts:86`) calls `validateIdeaStage` and treats any non-error result as a pass (including the trivially-passing non-idea stages). A founder who runs `founder advance` twice in a row would silently skip from idea → mvp → launch with no gate check on the mvp stage.

### Proposed fix

- Before implementing mvp/launch/scale validation: add a warning when advancing from a stage that has no gate checks defined. Example: `ADVANCED: ai-agent mvp -> launch (warning: no gate validation defined for mvp stage)`.
- When adding mvp stage support: add a `stageManifest.mvp` with its own required artifacts and a `GateSchema` for mvp criteria.

### Related files

- `src/lib/validate.ts:271-278` — early return for non-idea stages
- `src/stages/idea.ts` — only defines `idea` manifest
- `src/commands/advance.ts:86-119` — advance logic
- `src/stages/order.ts` — stage order definition

---

## Issue 3: `founder check` Hardcodes "idea" Stage

**Severity**: minor
**Source**: `src/commands/check.ts:22`

### What happened

`checkIdea()` always validates against `"idea"` regardless of `state.currentStage`:

```ts
const result = await validateIdeaStage(workspaceRoot, ideaSlug, "idea");
```

This is inconsistent with `advanceIdea()` and `buildIdeaReport()`, which both pass `state.currentStage`. For an idea that has advanced to mvp, `founder check` will always report `STATE_STAGE_MISMATCH`.

### Proposed fix

Read `state.json` first and pass `state.currentStage` to `validateIdeaStage`, matching the pattern in `advance.ts:86` and `report.ts:161`.

### Related files

- `src/commands/check.ts:22`
- `src/commands/advance.ts:86` — correct pattern to follow
- `src/lib/report.ts:161` — correct pattern to follow

---

## Issue 4: Evidence Field Is Flat — No Claim-Level Citation Mapping

**Severity**: suggestion (design limitation)
**Source**: `src/schemas/artifacts.ts:46-52`

### What happened

The Review Loop (Codex peer) repeatedly pushed for claim-level evidence granularity. The current schema is:

```ts
export const ArtifactFrontmatterSchema = z.object({
  artifact: IdeaArtifactNameSchema,
  stage: z.literal("idea"),
  status: ArtifactStatusSchema,
  updated: ArtifactUpdatedSchema,
  evidence: z.array(z.string()),  // flat list of URLs or filenames
});
```

`evidence` is a flat array of strings — URLs or sibling artifact filenames. There is no way to express "this specific number came from this specific source" at the schema level.

The CLI validator (`validate.ts:210-218`) checks that each evidence string resolves to an existing artifact file (e.g., `problem-hypothesis.md#customer` → checks that `problem-hypothesis.md` exists). It does not validate URL evidence beyond existence as a string.

### Why this matters

During the Review Loop, Codex flagged that interview claims (e.g., "8 of 12 interviewees would pay $20-50/seat/month") could not be traced to a specific source. Without claim-level citations, a founder could fabricate interview data and still pass `founder check`.

### Design trade-off

Adding claim-level evidence (e.g., `evidence: [{claim: "...", source: "...", type: "interview"}]`) would increase schema complexity and artifact authoring friction. The current design prioritizes simplicity — evidence is advisory metadata, not a cryptographic proof chain.

### Proposed direction

Two levels of improvement, not mutually exclusive:

1. **Inline discipline** (no schema change): Establish a convention of inline source annotations in artifact body text, e.g., "(Stack Overflow Survey 2024)" or "(Interviewee #3, Series B CTO)". The validator could optionally check that at least one inline citation pattern exists in the body.
2. **Structured evidence** (schema change): Evolve the `evidence` field from `z.array(z.string())` to `z.array(z.object({label, url, claims: z.array(z.string())}))`. Each evidence entry declares which specific claims it supports.

### Related files

- `src/schemas/artifacts.ts:51` — `evidence: z.array(z.string())`
- `src/lib/validate.ts:210-218` — evidence target existence check
- `.review-loop/2026-05-26-180803-branch-commits/summary.md` — Review Loop findings f1-f5 all relate to evidence granularity

---

## Issue 5: Placeholder Detection Is Overly Permissive

**Severity**: minor
**Source**: `src/lib/placeholder.ts`

### What happened

The placeholder detector flags a body as placeholder only if ALL content lines match placeholder patterns (`tbd`, `todo`, `placeholder`, etc.). This means an artifact with 15 lines of real content and one `TBD` in a subsection would pass the placeholder check:

```ts
return contentLines.every(
    (line) => PLACEHOLDER_LINES.has(line) || PLACEHOLDER_PREFIX.test(line) || line.includes("lorem ipsum"),
);
```

During the e2e test, the three required artifacts were filled completely, so this wasn't triggered as a failure. But a founder could write substantive content for the main sections and leave "Riskiest Assumption: TBD" at the bottom — the validator would pass it.

### Is this intended?

Likely yes for the current slice. A stricter check (e.g., "any TBD line is a failure") would force founders to fill every subsection before advancing. The current design assumes the gate criteria answers (`GATE.md`) are the quality gate — if a key claim is TBD, the gate criteria won't have evidence to link to.

### Proposed fix

Consider adding a "check" severity: `WARNING` for artifacts that have any placeholder lines, distinct from `PLACEHOLDER_ARTIFACT` which fires only for fully-empty artifacts. This gives the founder feedback without blocking advancement.

### Related files

- `src/lib/placeholder.ts:4-17`
- `src/lib/validate.ts:142-148` — `isPlaceholderBody` usage

---

## Issue 6: Workspace Flag Position Is Non-Standard

**Severity**: suggestion (UX)
**Source**: `src/router.ts:22-39`, `src/lib/paths.ts:19-36`

### What happened

`--workspace` must appear after the command verb (e.g., `founder status --workspace path`). If placed before (`founder --workspace path status`), the router treats `--workspace` as the command verb and returns `UNKNOWN_COMMAND`.

This is because `routeArgv()` uses `argv[0]` as the command verb unconditionally — it doesn't scan past flags to find the verb. Typical CLI conventions (git, npm, docker) allow global flags before the subcommand.

### Proposed fix

In `routeArgv()`, skip leading `--*` flags before extracting the command verb:

```ts
export function routeArgv(argv: string[]): RouteResult {
  let i = 0;
  while (i < argv.length && argv[i].startsWith("--")) i++;
  const [verb = "", ...args] = argv.slice(i);
  // ... rest unchanged
}
```

This would require adjusting the flag parsing in commands that currently use `positionalArgs()` — they'd need to be aware that leading flags were already consumed. Alternative: parse `--workspace` in `main()` before routing.

### Related files

- `src/router.ts:22-24` — `routeArgv` verb extraction
- `src/lib/paths.ts:20-36` — `workspaceFlagValue`
- `src/cli.ts:31-32` — `main()` calls `routeArgv` then `resolveWorkspaceRoot`

---

# Part II: Structural Gaps from Multi-Stage Re-Evaluation

Date: 2026-05-26
Source: Walkthrough of a hypothetical idea ("an AI Agent that organizes my knowledge base") across the **full** Scale Set flow — `idea → mvp → launch → scale` — not just the Idea stage.

## Re-evaluation method

Issues 1–6 came from running a single idea through the **Idea stage** end to end. To find what the first pass could not see, we took a fresh idea and walked it *past* the Idea gate, asking at each step: "what does the engine actually do here?" The Idea stage works as designed. Everything past the first gate degrades silently. This section records those structural gaps (Issues 7–15).

## Root cause: the engine hardcodes "idea" as a literal in ~6 places

Issues 2 and 3 (the two "major" findings) are not independent bugs. They — and Issues 7–12 below — are faces of one root cause: **stage identity is a hardcoded literal, not data in a stage registry.** The string `"idea"` (or an idea-shaped assumption) is baked into:

| Site | What is hardcoded | file:line |
|------|-------------------|-----------|
| stage manifest | only `idea` has required/recommended artifacts | `src/stages/idea.ts:8` |
| gate schema | criteria keys are the 3 idea questions | `src/schemas/gate.ts:13-17` |
| artifact schema | `stage: z.literal("idea")` | `src/schemas/artifacts.ts:48` |
| validator | early-return for `stage !== "idea"` | `src/lib/validate.ts:271-278` |
| `check` command | passes literal `"idea"` | `src/commands/check.ts:22` |
| reporting | empty checklist + `"n/a"` gate token for non-idea | `src/lib/report.ts:97-99,121-130` |

Fix the root (a data-driven stage registry: manifest + gate criteria + templates per stage) and Issues 2, 3, 7, 8, 10, 11, 12 collapse together. This is the scope chosen for the `founder-multistage` Tech Spec (de-hardcode the engine + make advancing into an undefined-gate stage **block/warn** instead of silently passing; no real MVP/Launch/Scale content yet).

---

## Issue 7: Stage Manifest Is Idea-Only

**Severity**: major (structural)
**Source**: `src/stages/idea.ts:8`

`stageManifest` defines required/recommended artifacts for `idea` only. `mvp`, `launch`, and `scale` appear in `stageOrder` (`src/stages/order.ts`) and in `StageSchema` (`src/schemas/state.ts`) but have no manifest, so the validator and reporter have nothing to check against once an idea advances.

### Proposed fix

Replace the single `stageManifest.idea` object with a registry keyed by `Stage`. For the `founder-multistage` scope, mvp/launch/scale may register **empty-but-present** manifests (no required artifacts yet) so the engine treats them as defined-without-content rather than undefined.

### Related files

- `src/stages/idea.ts:8` — `stageManifest`
- `src/stages/order.ts` — `stageOrder`, `nextStage`
- `src/lib/validate.ts:48-50` — `evidenceTargets` built only from idea manifest

---

## Issue 8: No Gate Schema Beyond Idea

**Severity**: major (structural)
**Source**: `src/schemas/gate.ts:13-17`

`GateSchema.criteria` hardcodes the three idea criteria (`problem_real_specific`, `solution_addresses_actual_problem`, `enough_signal_to_build`). There is no way to express gate criteria for any other stage, so even if a founder writes a `GATE.md` in `mvp/`, nothing validates it.

### Proposed fix

Make gate criteria data-driven per stage (criteria-key sets registered alongside each stage manifest). For the chosen scope, non-idea stages may register an **empty criteria set** — which then drives the "no gate defined → block/warn on advance" behavior rather than a silent pass.

### Related files

- `src/schemas/gate.ts:13-17` — hardcoded idea criteria
- `src/lib/report.ts:13-17` — duplicate hardcoded criteria list

---

## Issue 9: No Templates Beyond Idea

**Severity**: minor (structural)
**Source**: `templates/idea/` only

`founder new` seeds Idea-stage templates from `templates/idea/`. No template tree exists for other stages, so a founder who advances has no scaffold to fill.

### Proposed fix

Out of scope for content, but the registry should declare a template path per stage so `advance` can seed whatever templates exist. For the chosen scope, non-idea template dirs may be absent and `advance` should seed nothing without erroring (see Issue 14).

### Related files

- `templates/idea/` — only template tree
- `src/commands/advance.ts:70-72` — `createStageDirectory`

---

## Issue 10: Artifact Schema Hardcodes `stage: z.literal("idea")`

**Severity**: major (structural)
**Source**: `src/schemas/artifacts.ts:48`

`ArtifactFrontmatterSchema` pins `stage` to the literal `"idea"`. Any artifact written under another stage dir fails frontmatter validation, so non-idea artifacts cannot be represented at all.

### Proposed fix

Widen `stage` to `StageSchema` (the full enum). Artifact-name validation should then be keyed by stage via the registry rather than the single `IdeaArtifactNameSchema` enum.

### Related files

- `src/schemas/artifacts.ts:48` — `stage: z.literal("idea")`
- `src/schemas/artifacts.ts:3-12` — `IdeaArtifactNameSchema`
- `src/schemas/state.ts` — `StageSchema`

---

## Issue 11: Validator Is Structurally Idea-Only

**Severity**: major (structural) — root of Issue 2
**Source**: `src/lib/validate.ts:271-278`

Beyond the early-return symptom in Issue 2, the validator's whole shape assumes idea: `evidenceTargets` is built from the idea manifest, gate parsing expects idea criteria, and the function is even named `validateIdeaStage`. It cannot validate a non-idea stage even if asked.

### Proposed fix

Generalize to `validateStage(workspaceRoot, ideaSlug, stage)` driven by the registry. When a stage has no gate criteria registered, return a distinct `NO_GATE_DEFINED` signal (not a silent ok) so `advance` can block or warn deliberately (Issue 2's chosen behavior).

### Related files

- `src/lib/validate.ts:271-278` — early return
- `src/lib/validate.ts:48-50` — idea-only evidence targets
- `src/commands/advance.ts:86` — consumer that treats non-error as pass

---

## Issue 12: Reporting Collapses Past Idea

**Severity**: minor (structural)
**Source**: `src/lib/report.ts:97-99,121-130`

`buildArtifactChecklist` returns `[]` and `summarizeGate` returns the token `"n/a"` for any non-idea stage. So `founder status`/`list` show an advanced idea as having no artifacts and no gate — visually indistinguishable from a broken workspace.

### Proposed fix

Drive the checklist and gate summary from the registry for the idea's actual `currentStage`. For a stage with an empty manifest, render an explicit "stage defined, no required artifacts yet" state rather than a blank/`n/a` collapse.

### Related files

- `src/lib/report.ts:97-99` — `buildArtifactChecklist` non-idea `[]`
- `src/lib/report.ts:121-130` — `summarizeGate` non-idea `"n/a"`

---

## Issue 13: Skills Are Idea-Only

**Severity**: suggestion (out of engine scope)
**Source**: `skills/founder-idea/SKILL.md:23`, `test/skill-lint.test.ts`

Only four Idea-stage producer skills exist, and `founder-idea` explicitly says "Do not use this skill for MVP, Launch, or Scale-stage execution." There is no producer guidance once an idea advances.

### Proposed fix

Out of scope for the engine-generalization spec (no MVP/Launch/Scale content yet). Logged so the eventual stage-content specs add skills + extend `test/skill-lint.test.ts` to them.

### Related files

- `skills/founder-idea/SKILL.md:23`
- `test/skill-lint.test.ts` — lint that new skills must satisfy

---

## Issue 14: `advance` Seeds No Stage Content

**Severity**: minor (structural)
**Source**: `src/commands/advance.ts:70-72`

`createStageDirectory` only `mkdir`s the next stage directory — it seeds no templates or `GATE.md`. After advancing, the founder lands in an empty directory with no scaffold.

### Proposed fix

Have `advance` seed whatever templates the registry declares for the target stage (Issue 9). For the chosen scope, seeding nothing is acceptable when no templates are declared, but it must not error and the resulting empty-but-defined stage must report cleanly (Issue 12).

### Related files

- `src/commands/advance.ts:70-72` — `createStageDirectory`
- `src/commands/new.ts` — idea-stage seeding pattern to mirror

---

## Issue 15: No Kill / Archive Terminal Outcome

**Severity**: suggestion (design / philosophy gap)
**Source**: `src/lib/transition.ts:35-37`, `src/schemas/state.ts`

The product thesis is that "most ideas are expected to be killed at the Idea gate" (`.harness/founder-idea-slice/spec.md:243`), yet the state machine has only forward transitions (`advanceStage`) and a single terminal (`scale`). There is no `killed`/`archived` outcome, so the tool can gate an idea *forward* but has no vocabulary for the most common real result.

### Design trade-off

Adding a terminal `killed` state touches `StageSchema`, transitions, reporting, and `list` filtering. It is arguably the highest-value *product* gap but is orthogonal to the engine-generalization root cause. Recommend logging now and addressing in a dedicated follow-up spec rather than overloading `founder-multistage`.

### Related files

- `src/lib/transition.ts:35-37` — `TerminalStageTransitionError`, scale-only terminal
- `src/schemas/state.ts` — `StageSchema`, no terminal-outcome field
- `src/lib/report.ts:201-234` — `buildIdeaList` (would need a killed filter)

---

## Issue 16: Evidence Field Decision — Adopt Structured Evidence

**Severity**: design decision (resolves Issue 4)
**Source**: `src/schemas/artifacts.ts:51`

Re-evaluation resolved the Issue 4 trade-off in favor of the **structured evidence** option: evolve `evidence` from `z.array(z.string())` to a structured form (`{label, url?, claims: string[]}`) so each source declares which specific claims it supports. This makes interview claims traceable at the schema level (the gap Codex repeatedly flagged).

### Consequence (must be planned)

This is a breaking schema change. Existing Idea artifacts (including the committed `founder-journey/ai-agent/` demo) use the flat string array and will fail validation unless migrated or supported via a back-compat parse. The `founder-multistage` spec must include a migration/back-compat checkpoint, not just the schema edit.

### Related files

- `src/schemas/artifacts.ts:51` — `evidence: z.array(z.string())`
- `src/lib/validate.ts:210-218` — evidence target existence check (must read the new shape)
- `founder-journey/ai-agent/idea/*.md` — committed artifacts needing migration

---

## Summary

| # | Issue | Severity | In `founder-multistage` scope? |
|---|-------|----------|-----------------|
| 1 | Active idea caching pollutes tests | major | Yes — test isolation |
| 2 | Non-idea stages skip gate validation | major | Yes — block/warn on no-gate advance |
| 3 | `check` hardcodes "idea" stage | minor | Yes — read currentStage |
| 4 | Flat evidence field, no claim-level mapping | suggestion | Resolved by Issue 16 |
| 5 | Placeholder detection too permissive | minor | Yes — add warning tier |
| 6 | Workspace flag position non-standard | suggestion | Yes — skip flags in router |
| 7 | Stage manifest is idea-only | major (structural) | Yes — stage registry |
| 8 | No gate schema beyond idea | major (structural) | Yes — data-driven criteria |
| 9 | No templates beyond idea | minor (structural) | Partial — registry declares path; no content |
| 10 | Artifact schema hardcodes `stage: z.literal("idea")` | major (structural) | Yes — widen to `StageSchema` |
| 11 | Validator is structurally idea-only | major (structural) | Yes — `validateStage` + `NO_GATE_DEFINED` |
| 12 | Reporting collapses past idea | minor (structural) | Yes — registry-driven checklist/gate |
| 13 | Skills are idea-only | suggestion | No — deferred to stage-content specs |
| 14 | `advance` seeds no stage content | minor (structural) | Yes — seed declared templates; no-op if none |
| 15 | No kill / archive terminal outcome | suggestion (philosophy) | No — deferred to dedicated follow-up spec |
| 16 | Adopt structured evidence (resolves #4) | design decision | Yes — schema change + migration |

### Scope decisions (2026-05-26 re-evaluation)

- **Spec scope**: Option B — generalize the engine into a data-driven stage registry and make advancing into an undefined-gate stage **block/warn** instead of silently passing. No real MVP/Launch/Scale content (manifests/gates/templates/skills) in this spec.
- **Evidence model**: structured evidence (Issue 16), accepting the breaking-change + migration cost.
- **Deferred to follow-up specs**: Issue 13 (stage skills), Issue 15 (kill/archive terminal outcome), and the actual MVP/Launch/Scale stage content.

### Verification

All 122 existing tests pass after the e2e workflow (Part I). No regressions introduced by the demo artifacts (committed to `feat/founder-idea-slice`). The Review Loop produced consensus after 3 rounds — 8 findings resolved, 1 deferred for design discussion. Part II gaps were found by static walkthrough of the multi-stage flow against the cited source; they are recorded here and carried into the `founder-multistage` Tech Spec.
