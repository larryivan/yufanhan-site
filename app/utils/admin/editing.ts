import { EditorSelection } from '@codemirror/state'
import type { ChangeSpec, EditorState, Line } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

/**
 * The toolbar's Markdown commands, on the CodeMirror editor. Each works on every
 * selection, puts the cursor where typing continues, and is one undo step.
 */

const done = (view: EditorView) => {
  view.focus()
  return true
}

/** Whether `marker` sits at [from, to) and is not part of a longer run (`*` inside `**`). */
const markerAt = (state: EditorState, from: number, to: number, marker: string) => {
  if (from < 0 || to > state.doc.length || state.sliceDoc(from, to) !== marker) return false
  const char = marker[0]!
  return state.sliceDoc(from - 1, from) !== char && state.sliceDoc(to, to + 1) !== char
}

/** Wraps each selection in `before`…`after`, or unwraps it when it is wrapped already. */
export const toggleWrap = (view: EditorView, before: string, after = before, placeholder = 'text') => {
  const { state } = view
  view.dispatch(
    state.changeByRange((range) => {
      const text = state.sliceDoc(range.from, range.to)
      if (
        markerAt(state, range.from - before.length, range.from, before) &&
        markerAt(state, range.to, range.to + after.length, after)
      ) {
        return {
          changes: [
            { from: range.from - before.length, to: range.from },
            { from: range.to, to: range.to + after.length }
          ],
          range: EditorSelection.range(range.from - before.length, range.to - before.length)
        }
      }
      if (text.length > before.length + after.length && text.startsWith(before) && text.endsWith(after)) {
        const inner = text.slice(before.length, text.length - after.length)
        return {
          changes: { from: range.from, to: range.to, insert: inner },
          range: EditorSelection.range(range.from, range.from + inner.length)
        }
      }
      const content = text || placeholder
      const start = range.from + before.length
      return {
        changes: { from: range.from, to: range.to, insert: before + content + after },
        range: EditorSelection.range(start, start + content.length)
      }
    }),
    { scrollIntoView: true, userEvent: 'input' }
  )
  return done(view)
}

const selectedLines = (state: EditorState) => {
  const lines = new Map<number, Line>()
  for (const range of state.selection.ranges) {
    const last = state.doc.lineAt(range.to).number
    for (let number = state.doc.lineAt(range.from).number; number <= last; number++) {
      lines.set(number, state.doc.line(number))
    }
  }
  return [...lines.values()]
}

/** Starts every selected line with `prefix`, or takes it off when they all have it. */
export const toggleLinePrefix = (view: EditorView, prefix: string, existing: RegExp) => {
  const { state } = view
  const lines = selectedLines(state)
  const all = lines.every((line) => existing.test(line.text))
  const changes: ChangeSpec[] = lines.map((line) => {
    const match = existing.exec(line.text)
    if (all) return { from: line.from, to: line.from + (match?.[0].length ?? 0) }
    // Another list or quote marker is swapped for this one.
    const other = /^\s*(?:[-*+]\s(?:\[[ xX]\]\s)?|\d+[.)]\s|>\s?)/.exec(line.text)
    return { from: line.from, to: line.from + (other?.[0].length ?? 0), insert: prefix }
  })
  view.dispatch({ changes, scrollIntoView: true, userEvent: 'input' })
  return done(view)
}

/** Section heading, then subsection, then plain text again. The title is the post's h1. */
export const cycleHeading = (view: EditorView) => {
  const { state } = view
  const line = state.doc.lineAt(state.selection.main.head)
  const level = /^(#{1,6})\s/.exec(line.text)?.[1]?.length ?? 0
  const next = level === 0 ? '## ' : level === 2 ? '### ' : ''
  const current = /^#{1,6}\s+/.exec(line.text)?.[0].length ?? 0
  view.dispatch({
    changes: { from: line.from, to: line.from + current, insert: next },
    selection: EditorSelection.cursor(line.to - current + next.length),
    userEvent: 'input'
  })
  return done(view)
}

/**
 * Puts `block` on lines of its own, a blank line apart from what is around it,
 * in place of the selection — or after the cursor's line, so a paragraph is never
 * split — and selects `select` (offsets into `block`), or puts the cursor at its end.
 */
export const insertBlock = (view: EditorView, block: string, select?: [number, number]) => {
  const { state } = view
  const range = state.selection.main
  let from = range.from
  let to = range.to
  if (range.empty) {
    const line = state.doc.lineAt(range.head)
    if (line.text.trim()) from = to = line.to
    else {
      from = line.from
      to = line.to
    }
  }
  const before = state.sliceDoc(Math.max(0, from - 2), from)
  const after = state.sliceDoc(to, to + 2)
  const lead = from === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const trail = to === state.doc.length ? '\n' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const start = from + lead.length
  view.dispatch({
    changes: { from, to, insert: lead + block + trail },
    selection: select ? EditorSelection.range(start + select[0], start + select[1]) : EditorSelection.cursor(start + block.length),
    scrollIntoView: true,
    userEvent: 'input'
  })
  return done(view)
}

const selectionText = (view: EditorView) => {
  const { from, to } = view.state.selection.main
  return view.state.sliceDoc(from, to)
}

const URL_TEXT = /^(https?:\/\/|\/)\S+$/

/** A link around the selection, with the address selected to type over — or around the address when that is what was selected. */
export const insertLink = (view: EditorView) => {
  const { state } = view
  const range = state.selection.main
  const text = state.sliceDoc(range.from, range.to)
  if (URL_TEXT.test(text)) {
    view.dispatch({
      changes: { from: range.from, to: range.to, insert: `[](${text})` },
      selection: EditorSelection.cursor(range.from + 1),
      userEvent: 'input'
    })
    return done(view)
  }
  const label = text || 'text'
  const url = 'https://'
  const start = range.from + label.length + 3
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: `[${label}](${url})` },
    selection: text ? EditorSelection.range(start, start + url.length) : EditorSelection.range(range.from + 1, range.from + 1 + label.length),
    scrollIntoView: true,
    userEvent: 'input'
  })
  return done(view)
}

/** Inline code for part of a line, a fenced block (cursor where its language goes) for more. */
export const insertCode = (view: EditorView) => {
  const text = selectionText(view)
  if (text && !text.includes('\n')) return toggleWrap(view, '`')
  return insertBlock(view, `\`\`\`\n${text}\n\`\`\``, [3, 3])
}

export const insertMath = (view: EditorView, display: boolean) => {
  const text = selectionText(view)
  if (!display) return toggleWrap(view, '$', '$', 'x')
  return insertBlock(view, `$$\n${text}\n$$`, text ? [3, 3 + text.length] : [3, 3])
}

export const CALLOUTS = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const

export const insertCallout = (view: EditorView, type: (typeof CALLOUTS)[number]) => {
  const text = selectionText(view)
  const lines = (text || '').split('\n').map((line) => `> ${line}`.trimEnd())
  const block = `> [!${type}]\n${lines.join('\n') || '>'}`
  return insertBlock(view, block.endsWith('>') ? `${block} ` : block)
}

export const insertTable = (view: EditorView) =>
  insertBlock(view, '| Column | Column |\n| --- | --- |\n|  |  |', [2, 8])

/** A numbered footnote: the marker at the cursor, its text at the end, where the cursor goes. */
export const insertFootnote = (view: EditorView) => {
  const { state } = view
  const used = [...state.doc.toString().matchAll(/\[\^(\d+)\]/g)].map((match) => Number(match[1]))
  const id = Math.max(0, ...used) + 1
  const at = state.selection.main.to
  const end = state.doc.length
  const tail = state.sliceDoc(Math.max(0, end - 2), end)
  const lead = tail.endsWith('\n\n') ? '' : tail.endsWith('\n') ? '\n' : '\n\n'
  const definition = `${lead}[^${id}]: `
  const marker = `[^${id}]`
  view.dispatch({
    changes: [
      { from: at, insert: marker },
      { from: end, insert: definition }
    ],
    selection: EditorSelection.cursor(end + marker.length + definition.length),
    scrollIntoView: true,
    userEvent: 'input'
  })
  return done(view)
}

/** Text in square brackets or a quoted title, escaped. */
const bracketed = (text: string) => text.replace(/\s+/g, ' ').trim().replace(/([[\]\\])/g, '\\$1')
const quoted = (text: string) => text.replace(/\s+/g, ' ').trim().replace(/(["\\])/g, '\\$1')

/** An image, as a figure when it has a caption; the size keeps the page from jumping as it loads. */
export const imageMarkdown = (url: string, alt: string, caption: string, width?: number, height?: number) => {
  const title = caption.trim() ? ` "${quoted(caption)}"` : ''
  const size = width && height ? `{width="${width}" height="${height}"}` : ''
  return `![${bracketed(alt)}](${url}${title})${size}`
}

export const linkMarkdown = (url: string, label: string) => `[${bracketed(label)}](${url})`

/** Inserts text at the cursor, in place of the selection. */
export const insertInline = (view: EditorView, text: string) => {
  const range = view.state.selection.main
  view.dispatch({
    changes: { from: range.from, to: range.to, insert: text },
    selection: EditorSelection.cursor(range.from + text.length),
    scrollIntoView: true,
    userEvent: 'input'
  })
  return done(view)
}
