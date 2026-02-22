# Implement Plan

## Overview

Implementation is executed by specialist agents working in isolated worktrees. Each agent follows a mandatory phased workflow with blocking gates between phases. This structure exists because agents tend to skip planning, chase errors down rabbit holes, run out of context, and produce work that ignores project conventions. The phased workflow with written plans prevents all of these failure modes.

Every agent -- coding, QA, and Guardian -- operates under the same phased structure. The Team Leader spawns agents using full templates from the playbook that embed the phased workflow and error recovery directly into the agent's prompt. Minimal prompts like "implement X in file Y" are never used.

Agents work exclusively in their assigned worktree directory. They never commit directly to the feature branch. Each worktree is created from the feature branch HEAD at the start of its wave, giving the agent a clean, isolated working directory with its own index and HEAD.

## Process

1. **Phase 0: Load Rules** -- The agent reads all required files before doing any work. This includes `CLAUDE.md` (project rules), `.claude/docs/ARCHITECTURE.md` (system architecture), the agent's own definition from `.claude/agents/`, the task description with acceptance criteria, and the QA checklist. The agent must not skim; this phase is blocking.
2. **Phase 1: Write Execution Plan** -- The agent produces a written plan that cites specific rules by name. The plan includes: task summary, applicable rules (cited by section), files to create/modify/avoid, step-by-step implementation order, acceptance criteria mapping, and risk assessment. No code is written until the plan is complete.
3. **Phase 2: Execute Plan** -- The agent follows its plan step by step, stating each step before executing it. On any error, the Error Recovery Protocol fires: stop, re-read the Phase 1 plan, classify the error scope (in scope my file, in scope not my file, out of scope), and fix with a maximum of 2 attempts. The agent never modifies files outside its scope, never refactors unrelated code, and never abandons the plan for tangential investigation.
4. **Phase 3: Self-Review** -- The agent re-reads its Phase 1 plan and verifies every acceptance criterion is met. It checks that all files listed in the plan were created or modified as intended, that no files outside scope were touched, and that the work follows project conventions.
5. **Phase 4: Spawn QA** -- The agent spawns a QA Review Agent on the same workbranch, passing along its Phase 1 plan so QA can verify the agent followed it. The QA checklist and task context are included in the spawn.

## Rules

- Every agent operates under the mandatory phased workflow. No phase may be skipped.
- Phase gates are blocking: Phase 0 must complete before Phase 1, Phase 1 before Phase 2, etc.
- Written plans must cite specific rules by name, proving the agent read and understood them.
- The Error Recovery Protocol limits fix attempts to 2 per error. After 2 failures, the agent reports to the Team Leader.
- Agents never modify files outside their assigned scope.
- Agents never commit directly to the feature branch -- only to their workbranch.
- All IPC goes through the preload bridge -- agents must not import `electron` in renderer code.
- `contextIsolation: true` and `nodeIntegration: false` must always be maintained.
- Components must clean up effects on unmount (event listeners, timers, observers, PTY processes).
- Naming conventions must be followed: PascalCase components, camelCase hooks with `use` prefix, `namespace:kebab-action` IPC channels, BEM CSS classes.

## Checks

- Agent's Phase 1 plan exists as text output before any code is written.
- All files created or modified match the task's file scope.
- No files outside the task's scope were modified.
- Error Recovery Protocol was followed for any errors encountered (max 2 attempts per error).
- All acceptance criteria from the task description are addressed.
- Code follows project conventions from CLAUDE.md (naming, patterns, security).
- Agent committed its work to the workbranch, not the feature branch.
- QA Review Agent was spawned with the Phase 1 plan included.

## Inputs

- Task description with acceptance criteria and file scope (from Create Plan step).
- Pre-filled QA checklist for the task.
- Worktree created from the feature branch HEAD.
- Agent spawn template with embedded phased workflow and error recovery.

## Outputs

- Completed code committed to the workbranch in the agent's worktree.
- Phase 1 plan (text output, preserved in context for QA).
- Self-review results confirming acceptance criteria are met.
- QA Review Agent spawned on the same workbranch.
