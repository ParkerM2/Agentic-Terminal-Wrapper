# Team Management

## Overview

The Team Leader orchestrates agent teams across waves with dependency tracking, progress monitoring, and crash recovery. This step covers the ongoing coordination work that happens throughout the feature lifecycle: creating teams and tasks, spawning agents on worktrees, tracking progress, managing wave transitions, and recovering from crashes.

Wave execution is the core coordination pattern. Tasks are grouped into waves based on dependencies. Within a wave, agents that touch different files run in parallel in isolated worktrees. Between waves, a fence check verifies the feature branch is stable before the next wave starts. The Team Leader never writes application code directly -- it decomposes, delegates, monitors, and coordinates.

Progress tracking is crash-safe by design. The progress file on disk (`.claude/progress/<feature-name>/events.jsonl`) survives terminal close, process kill, and session timeout. Git branches persist independently. When a new session picks up interrupted work, it reads the progress file and branch status to resume from the exact point of interruption.

## Process

1. **Create the team** -- Use `TeamCreate` with the feature name and description.
2. **Create tasks with dependencies** -- Use `TaskCreate` for each task, then `TaskUpdate` with `addBlockedBy` to establish the dependency chain. Standard dependency flow: types/schemas (no blockers) > business logic (blocked by types) > integration (blocked by logic) > presentation (blocked by integration).
3. **Create worktrees for Wave 1** -- From the feature branch HEAD, create a worktree per task: `git worktree add <worktreeDir>/<feature>/<task-slug> -b <workPrefix>/<feature>/<task-slug>`. All prefixes are configurable in `.claude/workflow.json`.
4. **Spawn agents** -- Use the full spawn templates from the playbook. Each agent prompt includes all 4 phases with blocking gates, the Error Recovery Protocol, task context, acceptance criteria, file scope, and QA checklist. Never use minimal prompts.
5. **Monitor progress** -- Update the progress file after every significant state change: team/tasks created, workbranch created, agent completes work, QA cycle (pass/fail), workbranch merged, integration complete.
6. **Complete a wave** -- Wait for all agents in the wave to report QA PASS. Merge all workbranches sequentially (one at a time, in task-number order). Delete merged workbranches. Run the wave fence check based on workflow mode.
7. **Wave fence verification** -- In strict mode: verify all workbranches merged and deleted, feature branch is clean, run lint/typecheck/test/build. In standard mode: verify workbranches merged, run lint only. In fast mode: skip fence entirely.
8. **Start next wave** -- After the fence passes, create new worktrees from the updated feature branch HEAD. Spawn agents for the next wave. Update the wave status table.
9. **Handle fence failures** -- For lint/typecheck failures: identify the responsible merged task, fix on the feature branch directly or create a fix task. For test failures: determine if from a new or existing test, investigate the gap. For build failures: fix missing imports or type mismatches on the feature branch.
10. **Crash recovery** -- Check for existing progress files, workbranches, feature branches, and teams. Read the JSONL event log. Resume from the first non-COMPLETE task: if workbranch has commits check QA status, if workbranch has no commits re-spawn the agent, if workbranch doesn't exist create it and spawn.

## Rules

- The Team Leader does not write application code directly. It decomposes, delegates, monitors, and coordinates.
- Agents work exclusively in their worktree directory -- no direct commits to the feature branch.
- Workbranches are merged one at a time, in wave order, then task-number order within a wave.
- After each merge, rebase the next workbranch on the updated feature branch HEAD before merging.
- Conflict prevention has 5 layers: file scoping, wave ordering, pre-merge rebase, sequential merges, and escalation.
- If rebase conflicts are non-trivial, escalate to the user. Never force through conflicts silently.
- Wave fence mode follows the workflow mode: strict = full verify, standard = lint only, fast = skip.
- QA round limits depend on workflow mode: strict = 3 rounds max, standard = 2 rounds, fast = 1 round.
- The progress file must be updated after every significant state change.
- Worktrees are removed after successful merge: `git worktree remove <worktreeDir>/<feature>/<task-slug>`.

## Checks

- Team exists with all tasks created and dependencies established.
- Each wave's worktrees were created from the correct feature branch HEAD.
- All agents were spawned with full templates (not minimal prompts).
- Progress file is up-to-date with current state of all tasks, branches, and waves.
- Wave status table shows correct status for each wave (PENDING, IN_PROGRESS, FENCE_CHECK, COMPLETE, BLOCKED).
- Branch status table shows correct state for each workbranch (status, merged flag).
- Workbranches are deleted after successful merge.
- Wave fence check passed before starting the next wave (in strict/standard modes).

## Inputs

- Decomposed task list with dependencies, wave assignments, and file scopes (from Create Plan).
- Feature branch created from the base branch.
- `.claude/workflow.json` configuration (prefixes, worktree directory, mode).
- Agent roster from `.claude/agents/`.

## Outputs

- All workbranches merged to the feature branch in wave order.
- Progress file fully updated with task statuses, QA results, merge log, and wave status.
- All worktrees removed after merge.
- Feature branch stable and passing fence checks.
- Ready for Codebase Guardian final gate.
