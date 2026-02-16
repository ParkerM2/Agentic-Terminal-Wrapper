# Agentic Terminal Wrapper — Project Rules

## Tech Stack

- **Electron 34** — App shell (frameless window, custom title bar)
- **React 19** — UI framework (pure JavaScript, no TypeScript)
- **electron-vite 3** — Build system (main/preload/renderer bundles)
- **xterm.js 5.5** + **node-pty 1.1** — Terminal emulation + PTY spawning
- **CodeMirror 6** — Code editor (via @uiw/react-codemirror)
- **react-resizable-panels** — Split pane layout

## Commands

- `npm run dev` — Start in development mode (hot reload)
- `npm run build` — Production build to `out/`
- `npm run rebuild` — Rebuild native modules (node-pty)

## Architecture

Three-process Electron model. See `.claude/docs/ARCHITECTURE.md` for details.

- **Main** (`src/main/`) — Node.js process. PTY manager, file system IPC, settings persistence, window controls.
- **Preload** (`src/preload/`) — Context bridge. Exposes `window.electronAPI` with validated IPC methods.
- **Renderer** (`src/renderer/`) — Chromium process. React app with components, hooks, CSS theme.

## File Structure

```
src/main/index.js                    — Main process (PtyManager, IPC handlers)
src/preload/index.js                 — Preload bridge (contextBridge API)
src/renderer/src/App.jsx             — Root component, state management
src/renderer/src/App.css             — Full Tokyo Night Storm theme
src/renderer/src/hooks/useTerminal.js — xterm.js + PTY lifecycle hook
src/renderer/src/components/         — All React components
```

## Naming Conventions

- **Components**: PascalCase files, default-exported functions (`EditorPanel.jsx`)
- **Hooks**: camelCase with `use` prefix (`useTerminal.js`)
- **IPC channels**: `namespace:kebab-action` (`fs:read-file`, `pty:create`)
- **CSS classes**: BEM — `.block__element--modifier` (`terminal-pane__header`)
- **CSS variables**: `--category-name` (`--bg-dark`, `--accent-blue`)

## Patterns

- All state in `App.jsx` via `useState` — no Context API or state libraries
- Event handlers wrapped in `useCallback`
- Side effects in `useEffect` with proper cleanup returns
- Props flow down, callbacks flow up
- All IPC goes through the preload bridge — never import `electron` in renderer

## Security Rules

- `contextIsolation: true` and `nodeIntegration: false` — always
- IPC file system handlers validate paths against registered roots
- Never expose raw Node.js APIs to the renderer

## Agent Roster

See `.claude/agents/` for specialist agent definitions used by the workflow system.
