# Agentic Terminal Wrapper

A purpose-built Electron app that wraps Claude Code CLI instances with a proper GUI — clickable sidebar, file explorer, project tabs, split panes, image paste support, and Claude command integration.

## Vision

WezTerm and other terminal emulators lack real UI widget APIs — no clickable buttons, sidebars, or panels are possible through their plugin systems. Instead of fighting terminal limitations, Agentic Terminal Wrapper is a purpose-built Electron shell that gives Claude Code a proper GUI layer while keeping the full power of the CLI underneath.

The goal: a dedicated workspace for agentic coding — where you can monitor multiple Claude instances side by side, browse project files in a live-updating explorer, paste screenshots directly into prompts, and trigger workflow commands with a click.

## Progress

### Implemented

- **Terminal Panes** — xterm.js + node-pty with Git Bash, full PTY I/O, GPU-accelerated rendering via WebGL addon
- **Split Panes** — Horizontal/vertical splits with draggable resize handles (react-resizable-panels)
- **Project Tabs** — Color-coded tabs (Tokyo Night palette), add/close/switch, each tab has its own pane set
- **Sidebar** — Three sections toggled via icon nav:
  - **File Explorer** — Lazy-loaded directory tree with **live file watching** (`fs.watch` recursive) — auto-updates within 300ms when files are created, deleted, or renamed
  - **Claude Commands** — 14 clickable slash commands that send directly to the active terminal
  - **Settings** — Sidebar position (left/right), terminal font size
- **Custom Input Area** — Text input at bottom of pane container, image paste (Ctrl+V screenshot → thumbnail preview → saves to temp file → attaches path)
- **Frameless Window** — Custom title bar with drag region, minimize/maximize/close buttons
- **Tokyo Night Storm Theme** — Full dark theme via CSS variables, styled scrollbars, xterm.js theme colors
- **Keyboard Shortcuts** — Ctrl+T (new tab), Ctrl+W (close tab), Ctrl+Shift+| (split H), Ctrl+Shift+_ (split V)

### Planned

- Tab renaming (double-click to edit)
- Drag-to-reorder tabs
- Per-tab working directory picker
- Auto-start `claude` in new panes (configurable)
- Multiple theme options
- Persistent settings (save to disk)
- Context menu on terminal panes (copy, paste, split, close)
- Search in terminal scrollback

## Tech Stack

| Package | Purpose |
|---|---|
| Electron 34 | App shell |
| electron-vite | Build system (main/preload/renderer) |
| xterm.js 5.5 | Terminal emulator |
| node-pty | PTY process spawning |
| React 19 | UI framework |
| react-resizable-panels | Split pane layout |

## Getting Started

```bash
git clone https://github.com/ParkerM2/Agentic-Terminal-Wrapper.git
cd Agentic-Terminal-Wrapper
npm install
npm run dev
```

## Architecture

```
Electron Main Process
├── PTY Manager (node-pty) — spawns bash/claude per pane
├── File System API — directory listing + recursive file watcher
├── Clipboard API — image read + temp file save
└── IPC channels: pty:*, fs:*, clipboard:*, window:*
        ↕ contextBridge (preload.js)
Electron Renderer (React)
├── TabBar — project tab strip
├── Sidebar — explorer / commands / settings
├── PaneContainer — split pane management
├── TerminalPane — xterm.js wrapper
└── InputArea — text + image paste input
```

## License

MIT
