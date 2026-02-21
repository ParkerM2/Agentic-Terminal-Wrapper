/**
 * ClaudeScanner — side-channel scanner for PTY output.
 * Detects Claude CLI session start/stop, model name, and cost output.
 * Never blocks or modifies the PTY data stream.
 */
class ClaudeScanner {
  constructor(ptyId, emitFn) {
    this.ptyId = ptyId
    this.emit = emitFn
    this.buffer = ''
    this.maxBuffer = 2048
    this.active = false
    this.model = null
    this.cost = null
  }

  scan(data) {
    this.buffer += data
    if (this.buffer.length > this.maxBuffer) {
      this.buffer = this.buffer.slice(-this.maxBuffer)
    }

    // Detect Claude startup — look for common banner patterns
    if (!this.active) {
      // Claude Code banner: "╭" or "Claude Code" or model line like "claude-3-5-sonnet"
      if (
        /Claude\s+(Code|[\d.]+)/i.test(this.buffer) ||
        /\u256D/.test(data) && /claude/i.test(this.buffer)
      ) {
        this.active = true
        this.emit('claude:session-change', { ptyId: this.ptyId, active: true })
        this._checkModel()
      }
    }

    if (this.active) {
      this._checkModel()
      this._checkCost()
      this._checkExit(data)
    }
  }

  _checkModel() {
    // Match model patterns like "claude-opus-4-6", "claude-sonnet-4-6", etc.
    const modelMatch = this.buffer.match(/(claude-[\w-]+[\d][\w-]*)/i)
    if (modelMatch && modelMatch[1] !== this.model) {
      this.model = modelMatch[1]
      this.emit('claude:model-update', { ptyId: this.ptyId, model: this.model })
    }
  }

  _checkCost() {
    // Match cost patterns like "$0.05", "Total cost: $1.23"
    const costMatch = this.buffer.match(/\$(\d+\.\d{2,})/g)
    if (costMatch) {
      const latest = costMatch[costMatch.length - 1]
      if (latest !== this.cost) {
        this.cost = latest
        this.emit('claude:cost-update', { ptyId: this.ptyId, cost: this.cost })
      }
    }
  }

  _checkExit(data) {
    // Detect Claude exit — shell prompt returns ($ or > at end of line after newline)
    // This is heuristic: look for prompt-like patterns after a period of Claude being active
    if (/\n[^\n]*[\$#>]\s*$/.test(data) && !/claude/i.test(data)) {
      // Only trigger if recent buffer doesn't contain Claude-like output
      const recentChunk = this.buffer.slice(-200)
      if (!/[╭╰│─]/.test(recentChunk) && !/Claude/i.test(recentChunk.slice(-80))) {
        this.active = false
        this.model = null
        this.cost = null
        this.emit('claude:session-change', { ptyId: this.ptyId, active: false })
      }
    }
  }

  reset() {
    this.buffer = ''
    this.active = false
    this.model = null
    this.cost = null
  }
}

module.exports = { ClaudeScanner }
