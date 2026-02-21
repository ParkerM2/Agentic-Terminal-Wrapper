/**
 * Lightweight markdown to HTML renderer.
 * Supports: headings, bold, italic, inline code, code blocks, links, lists, paragraphs, horizontal rules.
 * Zero dependencies, ~60 lines.
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMarkdown(src) {
  const lines = src.split('\n')
  const out = []
  let i = 0
  let inList = false

  while (i < lines.length) {
    const line = lines[i]

    // Code block (fenced)
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]))
        i++
      }
      i++ // skip closing ```
      out.push(`<pre><code class="lang-${escapeHtml(lang)}">${codeLines.join('\n')}</code></pre>`)
      continue
    }

    // Close list if we're not on a list item
    if (inList && !/^\s*[-*+]\s/.test(line) && !/^\s*\d+\.\s/.test(line)) {
      out.push('</ul>')
      inList = false
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      out.push('<hr>')
      i++
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      out.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`)
      i++
      continue
    }

    // Unordered list item
    if (/^\s*[-*+]\s/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${inline(line.replace(/^\s*[-*+]\s/, ''))}</li>`)
      i++
      continue
    }

    // Ordered list item
    if (/^\s*\d+\.\s/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true }
      out.push(`<li>${inline(line.replace(/^\s*\d+\.\s/, ''))}</li>`)
      i++
      continue
    }

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph
    out.push(`<p>${inline(line)}</p>`)
    i++
  }

  if (inList) out.push('</ul>')
  return out.join('\n')
}

function inline(text) {
  return escapeHtml(text)
    // Bold **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}
