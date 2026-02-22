# Update Docs

## Overview

Documentation updates happen at two distinct points in the workflow. First, the QA Review Agent updates documentation incrementally on each workbranch when it issues a PASS verdict. This includes updating `ARCHITECTURE.md` for structural changes, updating other project docs when conventions or patterns change, and documenting new modules, services, or APIs. Second, the Codebase Guardian performs a final documentation coherence check on the fully-merged feature branch to ensure all per-task doc updates are consistent when combined.

The reason QA handles per-task doc updates is practical: QA has just reviewed the code in detail and has the deepest understanding of the changes. The workbranch becomes self-contained (code + QA verdict + doc updates), and when it merges, incremental doc updates come with it. No separate documentation agent is needed per task.

The Codebase Guardian's documentation coherence check (one of its 7 structural integrity checks) catches cross-cutting issues that per-task QA cannot see: conflicting descriptions of the same module across different doc updates, stale references to renamed files or removed features, and inconsistencies in the architecture description that only appear when all tasks are viewed together.

## Process

1. **Per-task doc updates (QA on PASS)** -- When the QA Review Agent issues a PASS verdict, it updates documentation on the workbranch before the branch is merged:
   - Update `.claude/docs/ARCHITECTURE.md` if structural changes were made (new IPC channels, new components, new hooks, changed state model, new extension points).
   - Update other project docs if conventions or patterns changed.
   - Document new modules, services, or API endpoints.
   - Commit documentation updates on the workbranch.
2. **Codebase Guardian structural checks** -- After all workbranches are merged to the feature branch, the Guardian runs 7 checks:
   - **File Placement**: Main process code only in `src/main/`, preload in `src/preload/`, React components in `src/renderer/src/components/`, hooks in `src/renderer/src/hooks/`, styles only in `src/renderer/src/App.css`.
   - **Electron Architecture**: Main process does not import renderer code, renderer does not import main process code, all cross-process communication goes through the preload bridge, IPC channels follow `namespace:action` naming, every `ipcMain.handle` has a corresponding `contextBridge` exposure.
   - **Component Consistency**: All components export a default function, props are destructured, event handlers use `useCallback`, side effects use `useEffect` with cleanup.
   - **State Management**: No prop drilling deeper than 2 levels, state lives at the lowest common ancestor, no duplicated state.
   - **Resource Cleanup**: Every `addEventListener` has a matching `removeEventListener`, intervals/timeouts are cleared, ResizeObservers are disconnected, PTY processes are killed on pane close, file watchers are closed on unmount.
   - **Naming Conventions**: PascalCase components, camelCase hooks with `use` prefix, `namespace:kebab-action` IPC channels, BEM CSS classes, `--category-name` CSS variables.
   - **Build Verification**: `npm run build` succeeds, no circular dependencies, all imports resolve.
3. **Guardian documentation fixes** -- The Guardian may fix minor structural issues (missing exports, import ordering) and documentation inconsistencies directly. For anything larger, it fails with instructions for the Team Leader.
4. **Final documentation coherence** -- The Guardian verifies that per-task doc updates are consistent when combined: no conflicting module descriptions, no stale file references, architecture description reflects the actual merged codebase.
5. **Guardian report** -- The Guardian outputs a structured report: PASS/FAIL, files scanned count, per-check results (7 checks), issues list with file:line references, fixes applied count, and issues requiring Team Leader intervention.

## Rules

- QA agents may only modify documentation files (on PASS) and progress/tracking files. They never modify application source code.
- Documentation updates must be committed on the workbranch before it is merged, so the branch is self-contained.
- The Codebase Guardian runs once per feature, after all tasks are merged. It is the final gate before PR creation.
- The Guardian may fix minor structural issues directly. For anything larger, it must FAIL with instructions.
- `ARCHITECTURE.md` must accurately reflect the IPC channel inventory, state management model, component tree, and extension points after the feature is complete.
- The Guardian is required in strict and standard modes. In fast mode, the Guardian is skipped.
- In standard mode, the Guardian auto-fixes trivial issues. In strict mode, all issues must be explicitly reported.

## Checks

- `ARCHITECTURE.md` is updated to reflect all structural changes from the feature.
- New IPC channels are documented in the IPC Channel Inventory.
- New components are shown in the component tree.
- New hooks are listed under extension points.
- State management section reflects any new state added to `App.jsx`.
- All 7 Guardian structural checks pass on the merged feature branch.
- No conflicting or stale documentation across per-task updates.
- Guardian report is PASS before PR creation proceeds.

## Inputs

- Merged feature branch with all workbranch changes (including per-task doc updates).
- Progress file with full task history and QA results.
- Recent git log (`git log --oneline -20`) showing all merge commits.
- Project rules from CLAUDE.md and current ARCHITECTURE.md.

## Outputs

- Updated `ARCHITECTURE.md` reflecting the complete feature.
- Updated project documentation where conventions or patterns changed.
- Codebase Guardian report (PASS/FAIL with details).
- Feature branch ready for PR creation (if Guardian passes).
