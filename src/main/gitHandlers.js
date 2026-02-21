const { execFile } = require('child_process')
const path = require('path')

// Allowlisted git subcommands — only these can be executed
const ALLOWED_SUBCOMMANDS = new Set([
  'status', 'diff', 'show', 'add', 'restore', 'rev-parse'
])

function runGit(args, cwd, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const subcommand = args[0]
    if (!ALLOWED_SUBCOMMANDS.has(subcommand)) {
      return reject(new Error(`Git subcommand not allowed: ${subcommand}`))
    }

    execFile('git', args, { cwd, timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message))
      } else {
        resolve(stdout)
      }
    })
  })
}

function parseStatusLine(line) {
  if (line.length < 4) return null
  const x = line[0] // staged status
  const y = line[1] // unstaged status
  const filePath = line.slice(3)

  let status = 'modified'
  if (x === '?' && y === '?') status = 'untracked'
  else if (x === 'A' || y === 'A') status = 'added'
  else if (x === 'D' || y === 'D') status = 'deleted'
  else if (x === 'R' || y === 'R') status = 'renamed'

  return {
    path: filePath,
    staged: x !== ' ' && x !== '?',
    status,
    x,
    y
  }
}

function registerGitHandlers(ipcMain, isPathAllowed) {
  // Check if cwd is inside a git repo
  ipcMain.handle('git:is-repo', async (event, { cwd }) => {
    try {
      await runGit(['rev-parse', '--is-inside-work-tree'], cwd)
      return { isRepo: true }
    } catch {
      return { isRepo: false }
    }
  })

  // Get parsed git status
  ipcMain.handle('git:status', async (event, { cwd }) => {
    try {
      const output = await runGit(['status', '--porcelain=v1'], cwd)
      const files = output
        .split('\n')
        .filter(Boolean)
        .map(parseStatusLine)
        .filter(Boolean)
      return { files, error: null }
    } catch (err) {
      return { files: [], error: err.message }
    }
  })

  // Get raw diff output for a file
  ipcMain.handle('git:diff', async (event, { cwd, filePath, staged }) => {
    try {
      const args = staged
        ? ['diff', '--cached', '--', filePath]
        : ['diff', '--', filePath]
      const output = await runGit(args, cwd)
      return { diff: output, error: null }
    } catch (err) {
      return { diff: '', error: err.message }
    }
  })

  // Get original file content from HEAD for MergeView
  ipcMain.handle('git:diff-file', async (event, { cwd, filePath }) => {
    try {
      const output = await runGit(['show', `HEAD:${filePath}`], cwd)
      return { content: output, error: null }
    } catch (err) {
      return { content: '', error: err.message }
    }
  })

  // Stage a file
  ipcMain.handle('git:stage', async (event, { cwd, filePath }) => {
    if (!isPathAllowed(path.resolve(cwd, filePath))) {
      return { error: 'Access denied: path outside allowed roots' }
    }
    try {
      await runGit(['add', '--', filePath], cwd)
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  })

  // Unstage a file
  ipcMain.handle('git:unstage', async (event, { cwd, filePath }) => {
    if (!isPathAllowed(path.resolve(cwd, filePath))) {
      return { error: 'Access denied: path outside allowed roots' }
    }
    try {
      await runGit(['restore', '--staged', '--', filePath], cwd)
      return { error: null }
    } catch (err) {
      return { error: err.message }
    }
  })
}

module.exports = { registerGitHandlers }
