import { syntaxTree } from '@codemirror/language'
import type { Range } from '@codemirror/state'
import { Decoration, ViewPlugin } from '@codemirror/view'
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'

/**
 * Typography for the Markdown source, beyond what syntax colouring can do:
 * heading lines get a class (their `##` hangs in the margin on wide screens),
 * formulas and MDC attributes (`{width="…"}`) are set in the monospace face, so
 * the prose reads like the article while TeX and code look like what they are.
 */

const headingLines = [1, 2, 3, 4, 5, 6].map((level) => Decoration.line({ class: `cm-heading cm-heading-${level}` }))
const headingMark = Decoration.mark({ class: 'cm-heading-mark' })
const mathMark = Decoration.mark({ class: 'cm-math' })
const mathLine = Decoration.line({ class: 'cm-math-block' })
const attributes = Decoration.mark({ class: 'cm-attrs' })

/** `$x$`, not `$$` and not an escaped `\$`. */
const INLINE_MATH = /(?<![\\$])\$(?!\$)(?:\\.|[^$\\\n])+?\$(?!\$)/g
/** `{width="1150" height="1320"}` after an image or link. */
const ATTRIBUTES = /(?<=[)\]])\{[^{}\n]*\}/g
const FENCE = /^\s*(```|~~~)/

const build = (view: EditorView): DecorationSet => {
  const { state } = view
  const { doc } = state
  const found: Range<Decoration>[] = []
  const last = doc.lineAt(view.viewport.to).number

  // Display formulas and code fences change state line by line, from the top.
  let inCode = false
  let inMath = false
  const first = doc.lineAt(view.viewport.from).number
  for (let number = 1; number <= last; number++) {
    const line = doc.line(number)
    const text = line.text.trim()
    const visible = number >= first
    if (!inMath && FENCE.test(line.text)) {
      inCode = !inCode
      continue
    }
    if (inCode) continue
    if (text.startsWith('$$')) {
      const oneLine = text.length > 3 && text.endsWith('$$')
      if (visible) found.push(mathLine.range(line.from))
      if (!oneLine) inMath = !inMath
      continue
    }
    if (inMath) {
      if (visible) found.push(mathLine.range(line.from))
      continue
    }
    if (!visible) continue
    // Inline code is not maths: blank it out before looking for dollars.
    const masked = line.text.replace(/`+[^`]*`+/g, (code) => ' '.repeat(code.length))
    for (const match of masked.matchAll(INLINE_MATH)) {
      found.push(mathMark.range(line.from + match.index, line.from + match.index + match[0].length))
    }
    for (const match of masked.matchAll(ATTRIBUTES)) {
      found.push(attributes.range(line.from + match.index, line.from + match.index + match[0].length))
    }
  }

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        const level = /^ATXHeading(\d)$/.exec(node.name)?.[1]
        if (level) {
          const line = doc.lineAt(node.from)
          found.push(headingLines[Number(level) - 1]!.range(line.from))
          const mark = node.node.firstChild
          if (mark?.name === 'HeaderMark' && mark.from === line.from) {
            const end = doc.sliceString(mark.to, mark.to + 1) === ' ' ? mark.to + 1 : mark.to
            found.push(headingMark.range(mark.from, end))
          }
          return false
        }
      }
    })
  }
  return Decoration.set(found, true)
}

export const markdownTypography = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = build(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = build(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
)
