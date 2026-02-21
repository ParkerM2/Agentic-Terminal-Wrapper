import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { json } from '@codemirror/lang-json'
import { markdown } from '@codemirror/lang-markdown'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { rust } from '@codemirror/lang-rust'

const LANG_MAP = {
  js: () => javascript({ jsx: true }),
  jsx: () => javascript({ jsx: true }),
  ts: () => javascript({ jsx: true, typescript: true }),
  tsx: () => javascript({ jsx: true, typescript: true }),
  mjs: () => javascript(),
  cjs: () => javascript(),
  py: () => python(),
  json: () => json(),
  md: () => markdown(),
  markdown: () => markdown(),
  html: () => html(),
  htm: () => html(),
  css: () => css(),
  scss: () => css(),
  c: () => cpp(),
  cpp: () => cpp(),
  h: () => cpp(),
  hpp: () => cpp(),
  java: () => java(),
  rs: () => rust(),
}

export function getLanguageExtension(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const factory = LANG_MAP[ext]
  return factory ? factory() : []
}

export function isMarkdownFile(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase()
  return ext === 'md' || ext === 'markdown'
}
