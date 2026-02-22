# Test

## Overview

Testing and build verification happen at multiple points in the workflow: during per-task QA (automated checks), during wave fence verification (between waves), and during the final Codebase Guardian check. This step documents the testing strategy across all these points and the specific checks that must pass before the feature can be considered complete.

The project uses `npm run build` as the primary build verification command. There is no separate lint or typecheck command in the current toolchain -- the build step via electron-vite catches compilation errors, missing imports, and bundling issues across all three processes (main, preload, renderer). Agents must adapt their check commands to the detected toolchain and never assume commands like `npm run lint` or `npm run test` exist.

Pre-flight checks are an additional verification layer in strict mode. Before spawning any agents, the Team Leader verifies the codebase baseline (build succeeds on the base branch). This is also mandatory for `/refactor` operations regardless of mode, since refactors must confirm the baseline is clean before making structural changes.

## Process

1. **Per-task automated checks (during QA)** -- The QA Review Agent runs `npm run build` as part of Phase 1 automated checks. The build must succeed. Additional checks for unused imports, dead code, and console errors are performed through code review rather than automated tooling.
2. **Wave fence verification (between waves)** -- After all agents in a wave complete and their workbranches are merged to the feature branch, the Team Leader runs the wave fence check:
   - Strict mode: verify all workbranches from this wave are merged and deleted, verify the feature branch is clean (`git status`), run `npm run build`.
   - Standard mode: verify workbranches are merged, run build only.
   - Fast mode: skip wave fence entirely, merge and proceed.
3. **Fence failure handling** -- If the build fails after merging a wave, the issue is usually missing imports or mismatches across merged modules. Fix on the feature branch directly, commit as `fix: resolve wave N fence failure`. If a test existed and broke, determine whether it was a new test (QA gap) or an existing test (cross-module issue from merging).
4. **Pre-flight checks (strict mode only)** -- Before spawning any agents, verify the baseline: `npm run build` on the base branch must succeed. If it fails, stop and report to the user. This is mandatory for `/refactor` regardless of mode.
5. **Final build verification (Codebase Guardian)** -- The Codebase Guardian runs `npm run build` on the fully-merged feature branch as check #7 (Build Verification). This is the final confirmation that the entire feature builds correctly when all tasks are combined. The Guardian also checks for circular dependencies and verifies all imports resolve.
6. **Merge protocol verification** -- After each workbranch merge, the Team Leader runs a quick sanity check: `git log --oneline -5` to confirm the merge commit, then adapts any available lint/build check to the project.

## Rules

- `npm run build` must succeed at every verification point: per-task QA, wave fence, and final Guardian check.
- Do not assume `npm run lint`, `npm run test`, or `npm run typecheck` exist. Check the project's `package.json` for available scripts.
- If a check command fails with "command not found" or "script not found", skip that check and log a warning. Do not treat it as a test failure.
- Pre-flight checks are mandatory in strict mode and for all `/refactor` operations.
- Wave fence strictness follows workflow mode: strict = full verify, standard = build only, fast = skip.
- Fence failures must be investigated and fixed before the next wave starts (in strict/standard modes).
- Never force through build failures silently. If the build breaks after merge, revert the merge (`git revert -m 1 <merge-commit>`), investigate, fix on the workbranch, and re-merge.

## Checks

- `npm run build` succeeds on the feature branch after all merges.
- No circular dependencies introduced by the feature.
- All imports resolve (no missing modules after merge).
- Wave fence verification passed for each completed wave (strict/standard modes).
- Pre-flight baseline was verified before agent spawning (strict mode).
- Any fence failures were resolved with fix commits on the feature branch.
- Build verification passes in the final Codebase Guardian check.

## Inputs

- Merged feature branch with all workbranch changes combined.
- Wave status table showing which waves have completed fence checks.
- Project toolchain information from `package.json`.
- Workflow mode (strict, standard, or fast).

## Outputs

- Confirmed build success on the feature branch.
- Wave fence results recorded in the progress file.
- Any fence failure fix commits on the feature branch.
- Build verification PASS from the Codebase Guardian.
