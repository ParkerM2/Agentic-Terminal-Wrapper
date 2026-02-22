# Create Plan

## Overview

Every feature begins with deep technical planning and task decomposition. No implementation work starts until the plan is complete and recorded in the progress file. This step corresponds to the PLAN phase of the lifecycle: reading requirements, analyzing the codebase, decomposing work into agent-ready tasks, mapping dependencies, and planning wave execution order.

The Team Leader drives this step. The output is a fully decomposed task list with file-level scoping, dependency graphs, wave assignments, context budget estimates, and pre-filled QA checklists for every task. Skipping or rushing this step is the single biggest predictor of feature failure.

Planning also includes risk assessment: identifying files that multiple tasks might need to touch, flagging large tasks that exceed context budget limits, and establishing the conflict prevention layers (file scoping, wave ordering, pre-merge rebase, sequential merges, escalation).

## Process

1. **Read requirements** -- Gather the feature request, user story, or bug report. Clarify ambiguities before proceeding.
2. **Read project rules** -- Load `CLAUDE.md` and `.claude/docs/ARCHITECTURE.md` to understand conventions, file structure, naming rules, and security constraints.
3. **Analyze the codebase** -- Identify which existing files, modules, and patterns the feature touches. Map the relevant IPC channels, components, hooks, and CSS.
4. **Architectural design** -- Decide how the feature fits into the three-process Electron model (main, preload, renderer). Determine which IPC channels to add, which components to create or modify, and which hooks to extract.
5. **Task decomposition** -- Break the feature into tasks where each task is assignable to exactly one agent, has a clear file scope (specific files to create or modify), has explicit acceptance criteria, and has no file-level overlap with any other task.
6. **Wave planning** -- Group tasks into waves based on dependencies. Wave 1 is foundation (types, schemas, contracts). Wave 2 is business logic (services, domain logic). Wave 3 is integration (API routes, handlers, state management). Wave 4 is presentation (UI components, styling). Wave 5 is automatic (QA handles doc updates per workbranch).
7. **Context budget estimation** -- For each task, estimate context usage: `8,000 base + (files x 1,000) + 3,000 margin`. If a task touches 13+ files, it must be split. Tasks touching 8-12 files should be evaluated for splitting.
8. **Fill QA checklists** -- Copy the QA Checklist Template into every task assignment. Fill in task-specific sections and feature-specific checks. Use auto-fill rules to select sections based on the assigned agent's role.
9. **Create progress file** -- Write the progress file to `.claude/progress/<feature-name>/events.jsonl` before spawning any agents. Include the task list, dependency graph, wave plan, branch status table, and context budget estimates.

## Rules

- No phase may be skipped in the lifecycle: PLAN > BRANCH > TRACK > ASSIGN > BUILD > QA > MERGE > GUARDIAN > PR.
- Each task must be assignable to exactly one agent with no file-level overlap.
- Tasks must have explicit acceptance criteria and a filled QA checklist.
- The progress file must be created before spawning any agents.
- Context budget must be estimated before every agent spawn (strict and standard modes).
- If a task touches more than 10 files, split it using the splitting protocol: identify natural split points (layer, feature, or file group boundaries), create sub-tasks with distinct file sets, assign to adjacent waves.
- Workflow mode (strict, standard, fast) must be resolved at feature start and recorded in the progress file. Resolution priority: per-invocation override > CLAUDE.md setting > default (strict).

## Checks

- Every task has exactly one assigned agent type from the agent roster.
- No two tasks modify the same file.
- Every task has explicit acceptance criteria listed.
- Every task has a pre-filled QA checklist.
- Wave dependencies form a DAG (no circular dependencies).
- Context budget estimates are recorded for each task (strict/standard modes).
- The progress file exists at `.claude/progress/<feature-name>/events.jsonl` with initial state.
- Feature branch `<featurePrefix>/<feature-name>` is created from the base branch.

## Inputs

- Feature request, user story, or bug report from the user.
- Current codebase state (CLAUDE.md, ARCHITECTURE.md, existing files).
- Workflow mode (strict, standard, or fast).
- Agent roster from `.claude/agents/`.

## Outputs

- Fully decomposed task list with file scopes and acceptance criteria.
- Dependency graph mapping task relationships.
- Wave execution plan (which tasks run in which wave).
- Context budget estimates per task.
- Pre-filled QA checklists for every task.
- Progress file initialized at `.claude/progress/<feature-name>/events.jsonl`.
- Feature branch created from base branch.
