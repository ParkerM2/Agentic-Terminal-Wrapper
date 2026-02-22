import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

// Xterm theme harmonized with shadcn dark neutral palette
// Neutral tones match oklch(0.145..0.985) background/foreground scale
// ANSI colors kept vibrant for terminal readability
const THEME = {
  background: '#202020',
  foreground: '#e8e8e8',
  cursor: '#f5f5f5',
  cursorAccent: '#202020',
  selectionBackground: '#3d3d3d',
  selectionForeground: '#f5f5f5',
  black: '#1a1a1a',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a8a8a8',
  brightBlack: '#555555',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#f5f5f5'
}

export function useTerminal(ptyId, containerRef, { cwd, autoStart, fontSize } = {}) {
  const termRef = useRef(null)
  const fitAddonRef = useRef(null)

  const writeToPty = useCallback((data) => {
    if (ptyId) {
      window.electronAPI.ptyWrite({ id: ptyId, data })
    }
  }, [ptyId])

  const fontSizeRef = useRef(fontSize || 14)
  fontSizeRef.current = fontSize || 14

  useEffect(() => {
    if (!containerRef.current || !ptyId) return

    const term = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      fontSize: fontSizeRef.current,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      allowTransparency: true,
      scrollback: 5000
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(new WebLinksAddon())

    // Try WebGL addon, fall back silently
    import('@xterm/addon-webgl').then(({ WebglAddon }) => {
      try {
        term.loadAddon(new WebglAddon())
      } catch {}
    }).catch(() => {})

    term.open(containerRef.current)

    // Small delay to ensure container is laid out
    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
      } catch {}
    })

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Create PTY
    const cols = term.cols
    const rows = term.rows
    window.electronAPI.ptyCreate({
      id: ptyId,
      cwd: cwd || undefined,
      cols,
      rows
    })

    // Terminal → PTY
    term.onData((data) => {
      window.electronAPI.ptyWrite({ id: ptyId, data })
    })

    // PTY → Terminal
    const unsubData = window.electronAPI.onPtyData(({ id, data }) => {
      if (id === ptyId) {
        term.write(data)
      }
    })

    const unsubExit = window.electronAPI.onPtyExit(({ id }) => {
      if (id === ptyId) {
        term.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n')
      }
    })

    // Auto-start claude if requested
    if (autoStart) {
      setTimeout(() => {
        window.electronAPI.ptyWrite({ id: ptyId, data: 'claude\n' })
      }, 1000)
    }

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        window.electronAPI.ptyResize({ id: ptyId, cols: term.cols, rows: term.rows })
      } catch {}
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      unsubData()
      unsubExit()
      term.dispose()
      window.electronAPI.ptyKill({ id: ptyId })
    }
  }, [ptyId, containerRef, cwd, autoStart])

  // Update font size without recreating terminal/PTY
  useEffect(() => {
    const term = termRef.current
    if (term) {
      term.options.fontSize = fontSize || 14
      try {
        fitAddonRef.current?.fit()
        if (ptyId) {
          window.electronAPI.ptyResize({ id: ptyId, cols: term.cols, rows: term.rows })
        }
      } catch {}
    }
  }, [fontSize, ptyId])

  const fit = useCallback(() => {
    if (fitAddonRef.current) {
      try {
        fitAddonRef.current.fit()
        if (termRef.current && ptyId) {
          window.electronAPI.ptyResize({
            id: ptyId,
            cols: termRef.current.cols,
            rows: termRef.current.rows
          })
        }
      } catch {}
    }
  }, [ptyId])

  const focus = useCallback(() => {
    termRef.current?.focus()
  }, [])

  return { termRef, writeToPty, fit, focus }
}
