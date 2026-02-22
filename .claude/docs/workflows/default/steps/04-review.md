# Review

## Overview

QA review is a per-task quality gate, not an end-of-pipeline step. Each coding agent spawns its own QA Review Agent immediately after completing work. QA happens on the same workbranch, ensuring the branch is self-contained: code changes, QA verdict, and documentation updates all live together. When the workbranch merges, incremental documentation updates come with it.

The QA Review Agent follows the same mandatory phased workflow as coding agents. It reads the task description, acceptance criteria, QA checklist, and the coding agent's Phase 1 plan. It then runs automated checks, reviews every changed file, traces data flow, and delivers a PASS or FAIL verdict with specific file paths and line numbers for any issues found.

QA round limits depend on the workflow mode. In strict mode, a task gets up to 3 QA rounds. In standard mode, 2 rounds. In fast mode, 1 round. If a task exhausts its QA rounds without passing, the coding agent reports to the Team Leader, who may reassign, intervene directly, or escalate to the user.

## Process

1. **Phase 1: Automated Checks** -- Run `npm run build` (must succeed). Check for console errors, unused imports, and dead code. Adapt checks to the project's actual toolchain. If a check command fails with "command not found" or "script not found", skip that check and log a warning.
2. **Phase 2: Code Diff Review** -- Review the git diff on the workbranch. Verify changes match the task description. Check for scope creep (files modified outside the task scope). Verify no security issues: path traversal in IPC handlers, unsanitized input, missing argument validation.
3. **Phase 3: Electron-Specific Checks** -- Verify IPC handlers validate arguments. Confirm no `nodeIntegration: true` or `contextIsolation: false`. Verify the preload bridge exposes minimal API surface. Confirm no arbitrary file system access without bounds checking.
4. **Phase 4: React/UI Checks** -- Verify components clean up effects on unmount. Check for memory leaks (event listeners, timers, observers). Verify state updates don't cause unnecessary re-renders. Confirm keyboard shortcuts don't conflict.
5. **Phase 5: Terminal/Editor Checks** -- Verify PTY processes are properly killed on cleanup. Confirm xterm.js instances are disposed. Check CodeMirror instances handle external file changes. Verify resize observers are disconnected.
6. **Phase 6: Verdict** -- Deliver PASS or FAIL.
   - **PASS**: QA updates documentation on the workbranch. Update `ARCHITECTURE.md` if structural changes were made. Update other project docs if conventions or patterns changed. Commit doc updates on the workbranch.
   - **FAIL**: Return specific issues with file paths and line numbers. List required fixes before re-review.

## Rules

- QA agents review all files but may only modify documentation files (on PASS) and progress/tracking files.
- QA agents never modify application source code. If changes are needed, FAIL the review with specific instructions.
- QA round limits: strict mode = 3 max, standard mode = 2 max, fast mode = 1 max.
- If a task fails QA after exhausting rounds, report to the Team Leader for reassignment or escalation.
- On PASS, QA must update documentation on the workbranch before the branch is merged.
- The QA report must follow the standard format: PASS/FAIL, task name, files reviewed count, issues count, and specific issue descriptions with file:line references.
- QA validates every item in the pre-filled QA checklist from the task assignment.
- QA compares the agent's actual work against its Phase 1 plan to verify the agent followed its own plan.

## Checks

- Build succeeds (`npm run build` or equivalent).
- No files modified outside the task's declared file scope.
- No security violations: IPC handlers validate arguments, contextIsolation is true, nodeIntegration is false, no unvalidated file system access.
- Components clean up all effects on unmount (event listeners, timers, observers, PTY processes, file watchers).
- All acceptance criteria from the task description are verified as met.
- Every item in the QA checklist is validated.
- The coding agent's Phase 1 plan was followed (plan vs actual comparison).
- On PASS: documentation is updated and committed on the workbranch.

## Inputs

- Coding agent's completed work committed on the workbranch.
- Coding agent's Phase 1 plan (for plan vs actual verification).
- Task description with acceptance criteria and file scope.
- Pre-filled QA checklist from the task assignment.
- Project rules from CLAUDE.md and ARCHITECTURE.md.

## Outputs

- QA verdict: PASS or FAIL.
- If PASS: documentation updates committed on the workbranch. The workbranch is ready for merge.
- If FAIL: issue list with file paths, line numbers, and specific fix instructions. The coding agent fixes and re-spawns QA (within round limits).
- QA report in standard format logged to the progress file.
