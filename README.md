# founder

A TypeScript CLI tool that guides founders through building a startup using AI. Inspired by [Anthropic's research on using AI to build a startup](https://www.anthropic.com/research/building-startup-with-ai), **founder** provides a deterministic, evidence-based framework for validating startup ideas before writing code.

```
founder init                          # initialize a workspace
founder new "AI-powered code review"  # create a new idea
founder status                        # check current progress
founder check                         # validate artifacts & gate
founder advance                       # advance to the next stage
```

## Installation

Requires **Node.js 20+**.

```bash
git clone https://github.com/stone16/claude-founder-playbook.git
cd claude-founder-playbook
npm install
npm run build
```

The CLI entry point is `dist/cli.js`, aliased as `founder` in `package.json`. Link it globally with:

```bash
npm link
```

Or run it directly:

```bash
node dist/cli.js <command>
```

## Quick Start

### 1. Initialize a Workspace

```bash
founder init
```

Creates a `_reference/` directory with surface guidance (`surfaces.md`) that explains when to use Chat, Cowork, or Code surfaces.

### 2. Create a New Idea

```bash
founder new "AI-Powered Code Review Tool"
```

Creates an idea workspace with:

- `state.json` — tracks the founder's progression through stages
- `idea/` — stage directory seeded with artifact templates and a gate file

The idea name is slugified (e.g., `"AI-Powered Code Review Tool"` → `ai-powered-code-review-tool`).

### 3. Work Through Artifacts

Use the bundled skills to guide artifact creation:

| Skill | Purpose | Artifacts |
|-------|---------|-----------|
| `founder-idea` | Overall Idea-stage orchestration | All Idea artifacts |
| `founder-pressure-test` | Stress-test problem & solution | `problem-hypothesis.md`, `solution-concept.md` |
| `founder-market-research` | Map competitors & market size | `competitive-landscape.md`, `market-sizing.md`, `trend-analysis.md` |
| `founder-user-discovery` | Plan & synthesize interviews | `customer-discovery-plan.md`, `interview-synthesis.md`, `prototype-learnings.md` |

Each artifact is a markdown file with YAML frontmatter that the CLI validates.

### 4. Check Your Progress

```bash
founder status   # show current stage, artifacts, and blockers
founder check    # validate all required artifacts and gate evidence
```

### 5. Advance Past the Gate

When `founder check` passes (all required artifacts complete, gate criteria answered with evidence):

```bash
founder advance
```

If validation fails but you want to proceed anyway:

```bash
founder advance --override "Reason for bypassing gate"
```

Overrides are recorded in `state.json` for traceability.

## The Founder Journey

### Stages

The framework models four stages of startup development:

| Stage | Status | Description |
|-------|--------|-------------|
| `idea` | Implemented | Validate the problem, market, and solution with evidence |
| `mvp` | Planned | Build and test a minimal viable product |
| `launch` | Planned | Ship to early users and iterate |
| `scale` | Planned | Grow the user base and business |

Only the **Idea** stage is fully implemented today. Later stages have empty manifests awaiting checkpoint work.

### Idea-Stage Artifacts

The Idea stage requires three core artifacts and recommends five supporting ones:

**Required:**

- **`problem-hypothesis.md`** — The specific problem, who has it, current workarounds, and urgency
- **`interview-synthesis.md`** — Patterns and contradictions from customer interviews
- **`solution-concept.md`** — The proposed solution and how it addresses the validated problem

**Recommended:**

- **`competitive-landscape.md`** — Competitor tiers: direct, adjacent, manual, status quo
- **`market-sizing.md`** — TAM, SAM, SOM with named assumptions
- **`trend-analysis.md`** — Regulatory, platform, budget, and behavior shifts
- **`customer-discovery-plan.md`** — Target segments and interview questions
- **`prototype-learnings.md`** — Evidence from prototype testing

### Gate System

The Idea gate is **not a vibe check**. It requires `GATE.md` with three criteria, each answered `true` and backed by evidence linked to existing artifacts:

| Criterion | What It Checks |
|-----------|---------------|
| `problem_real_specific` | The problem is real, specific, and owned by a reachable user |
| `solution_addresses_actual_problem` | The solution actually solves the validated problem |
| `enough_signal_to_build` | There is enough evidence to justify building |

Each criterion's `evidence` array must reference artifact files within the stage directory. The CLI validates that referenced artifacts exist and contain meaningful claims.

Gates enforce **deterministic, evidence-based** decisions — not intuition. Every claim must be traceable to an artifact.

## CLI Reference

| Command | Description |
|---------|-------------|
| `founder init` | Initialize a founder workspace |
| `founder new "<name>"` | Create a new idea workspace |
| `founder use "<slug>"` | Set an idea as the active workspace target |
| `founder list` | List all ideas in the workspace |
| `founder status` | Show current stage, artifacts, and blockers for the active idea |
| `founder check` | Validate all required artifacts and gate evidence |
| `founder advance [--override <reason>]` | Advance the idea to the next stage |

Global flags:

- `--workspace <path>` — Override the workspace root directory
- `--help` — Print usage information

## Architecture

### State Management

Each idea tracks its state in `state.json`:

```json
{
  "ideaName": "My Idea",
  "slug": "my-idea",
  "currentStage": "idea",
  "createdAt": "2026-05-28T13:00:00Z",
  "updatedAt": "2026-05-28T13:00:00Z",
  "overrides": []
}
```

### Validation

Artifacts are validated against Zod schemas:

- Frontmatter must match `ArtifactFrontmatterSchema` (artifact name, stage, status, updated timestamp, evidence entries)
- Gate frontmatter must match `GateSchema` (status, override, criteria with boolean answers and evidence arrays)
- Status must be `"complete"` for required artifacts
- Body content is checked against placeholder detection

### Three Surfaces

The framework distinguishes three working modes (see `_reference/surfaces.md`):

- **Chat** — Exploration, idea sharpening, assumption naming, interview prep
- **Cowork** — Shared artifact production and editing
- **Code** — Deterministic validation via the CLI

## Skills for AI Agents

The `skills/` directory contains SKILL.md files designed for AI agents (Claude, etc.) to follow when working with founders:

- **`founder-idea`** — Orchestrates the full Idea-stage workflow
- **`founder-pressure-test`** — Structured devil's advocate for concepts
- **`founder-market-research`** — Market mapping and sizing guidance
- **`founder-user-discovery`** — Interview planning and synthesis

Each skill defines purpose, when to use, workflow steps, artifacts produced, and CLI verbs — making the system self-documenting for AI-assisted founder work.

## Development

```bash
npm run build        # Compile TypeScript
npm run typecheck    # Type check without emitting
npm test             # Run test suite with Vitest
npm run test:coverage # Run tests with coverage
npm run lint         # ESLint
```

### Project Structure

```
src/
  cli.ts              # Entry point, command dispatch
  router.ts           # Argument routing to commands
  commands/           # CLI command implementations
  schemas/            # Zod validation schemas
  lib/                # Shared utilities (state, paths, validation, etc.)
  stages/             # Stage definitions and registry
skills/               # AI agent skill definitions (SKILL.md files)
templates/            # Seed templates for new idea workspaces
test/                 # Vitest test suite
docs/                 # Project documentation
```

## Contributing

This is an open source project. Contributions are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Implement your change with tests
4. Run `npm run build && npm test && npm run typecheck && npm run lint`
5. Open a pull request

### Adding New Stages

To add a new stage (e.g., `mvp`):

1. Add the stage name to `StageSchema` in `src/schemas/state.ts`
2. Define required artifacts and gate criteria in `src/stages/registry.ts`
3. Create templates under `templates/<stage>/`
4. Write or update the corresponding skill under `skills/`
5. Add tests for the new stage

## License

MIT
