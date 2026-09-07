---
name: founder-idea
description: Guide a founder through Idea-stage artifacts, evidence gates, and advancement.
---

# Founder Idea

## Purpose

Maintain Idea-stage evidence and advance through the harness gate.

Read `templates/idea/_reference/surfaces.md` when choosing whether the next step belongs in Chat, Cowork, or Code.

## When To Use

Use this skill when the user wants to:

- start a new founder idea workspace,
- work through Idea-stage artifacts,
- decide whether an idea has enough evidence to advance,
- understand what is blocking the Idea gate.

Do not use this skill for MVP, Launch, or Scale-stage execution.

## Idea-Stage Workflow

1. Create or select the idea. For a new concept, run `founder new "<idea name>"` so the workspace, Idea templates, gate, and state are created by the harness.
2. Clarify the problem hypothesis in Chat, then write or update `idea/problem-hypothesis.md`.
3. Bring in the activity skills when their work is needed:
   - `founder-pressure-test` for weaknesses, assumptions, and solution pressure.
   - `founder-market-research` for competitive landscape, sizing, and trends.
   - `founder-user-discovery` for interview planning and synthesis.
4. Keep the required artifacts current: `problem-hypothesis.md`, `interview-synthesis.md`, and `solution-concept.md`.
5. Run `founder status` to show the current checklist and blockers before asking the founder to make a gate decision.
6. Run `founder check` when the required artifacts and `GATE.md` appear complete.
7. If the gate passes and the founder wants to continue, run `founder advance`.

## Gate Handling

The Idea gate is not a vibe check. It requires `GATE.md` to answer these criteria with evidence linked to existing artifacts:

- `problem_real_specific`
- `solution_addresses_actual_problem`
- `enough_signal_to_build`

If `founder check` fails, keep working in the Idea stage and update the blocking artifacts or evidence links. If the founder knowingly wants to move on without a passing gate, explain the risk and use the harness override path only when they provide a concrete reason.

## CLI Verbs Used

`founder new`, `founder status`, `founder check`, and `founder advance` follow the workflow above.
