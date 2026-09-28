import { find, html, svg } from 'property-information'
import type { Schema } from 'property-information'

/**
 * Build-time rewrites of a parsed Markdown body, run by modules/content-build.ts
 * when @nuxt/content parses a file. The body is minimark: an element is
 * `[tag, props, ...children]` and a text node a bare string.
 *
 * @nuxt/content caches the result per file and keys the cache on the file and
 * the parser options, not on this code: after changing it, delete `.data/` so
 * every file is parsed again.
 */

type Props = Record<string, unknown>
export type MinimarkElement = [string, Props, ...MinimarkNode[]]
export type MinimarkNode = MinimarkElement | string

export interface MinimarkBody {
  value?: MinimarkNode[]
  toc?: { links?: { id: string }[] }
}

const isElement = (node: unknown): node is MinimarkElement =>
  Array.isArray(node) && typeof node[0] === 'string'

const childrenOf = (node: MinimarkElement) => node.slice(2) as MinimarkNode[]

/** Whitespace between block elements survives as text nodes such as "\n". */
const isBlank = (node: MinimarkNode) => typeof node === 'string' && !node.trim()

export const classesOf = (props: Props): string[] => {
  const value = props.className ?? props.class
  if (Array.isArray(value)) return value.map(String)
  return typeof value === 'string' ? value.split(/\s+/).filter(Boolean) : []
}

/* ---------------------------------------------------------------- MathML and SVG */

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttribute = (text: string) => escapeText(text).replace(/"/g, '&quot;')

const serialize = (node: MinimarkNode, schema: Schema): string => {
  if (typeof node === 'string') return escapeText(node)
  const [tag, props] = node
  const attributes = Object.entries(props)
    .filter(([key, value]) => key !== '__ignoreMap' && value !== undefined && value !== null && value !== false)
    .map(([key, value]) => {
      const text = Array.isArray(value) ? value.join(' ') : String(value)
      return ` ${find(schema, key).attribute}="${escapeAttribute(text)}"`
    })
    .join('')
  return `<${tag}${attributes}>${childrenOf(node).map((child) => serialize(child, schema)).join('')}</${tag}>`
}

/**
 * The renderer only knows HTML tag names: any other tag, such as MathML's
 * <mrow> or SVG's <path>, is looked up as a Vue component and, when none
 * exists, rendered as an element named after the PascalCase lookup (<Mrow>),
 * which neither the browser nor hydration recognise. KaTeX emits both: MathML
 * for screen readers, and SVG for stretchy glyphs such as \sqrt and \widehat.
 * Their contents are stored as markup instead, which the page inserts as is.
 */
const inlineForeignContent = (node: MinimarkElement): MinimarkElement => {
  const [tag, props] = node
  const schema = tag === 'math' ? html : tag === 'svg' ? svg : null
  if (!schema) return node
  const children = childrenOf(node)
  if (!children.length) return node
  return [tag, { ...props, innerHTML: children.map((child) => serialize(child, schema)).join('') }]
}

/* ---------------------------------------------------------------- callouts */

/** GitHub's five alert types, plus the Obsidian names that mean the same. */
const CALLOUT_TYPES: Record<string, string> = {
  note: 'note',
  info: 'note',
  tip: 'tip',
  hint: 'tip',
  important: 'important',
  warning: 'warning',
  attention: 'warning',
  caution: 'caution',
  danger: 'caution',
  error: 'caution'
}

const CALLOUT_TITLES: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution'
}

/**
 * The marker opening a callout's first paragraph. The Markdown parser turns
 * `[!NOTE]` into a <span> holding "!NOTE" (its `[text]` span syntax), but it
 * stays plain text when written as `\[!NOTE]`, so both are read.
 */
const readMarker = (first: MinimarkNode | undefined): { type: string, rest: string } | null => {
  if (isElement(first) && first[0] === 'span' && Object.keys(first[1]).length === 0) {
    const [text, ...more] = childrenOf(first)
    const match = !more.length && typeof text === 'string' ? /^!([a-z]+)$/i.exec(text) : null
    return match?.[1] ? { type: match[1], rest: '' } : null
  }
  if (typeof first === 'string') {
    const match = /^\[!([a-z]+)\]/i.exec(first)
    return match?.[1] ? { type: match[1], rest: first.slice(match[0].length) } : null
  }
  return null
}

/**
 * `> [!NOTE]`, `> [!TIP] Own title`, … — GitHub's and Obsidian's callout syntax,
 * so a note reads the same in either. Obsidian's fold markers (`[!NOTE]-`) are
 * accepted and ignored. An unknown type stays a plain quote.
 */
const toCallout = (node: MinimarkElement): MinimarkElement => {
  const blocks = childrenOf(node)
  const firstIndex = blocks.findIndex((child) => !isBlank(child))
  const first = blocks[firstIndex]
  if (!isElement(first) || first[0] !== 'p') return node

  const inline = childrenOf(first)
  const marker = readMarker(inline[0])
  const type = marker && CALLOUT_TYPES[marker.type.toLowerCase()]
  if (!marker || !type) return node

  // The rest of the marker line is the title; the lines after it, the body.
  const remaining: MinimarkNode[] = [marker.rest, ...inline.slice(1)]
  const title: MinimarkNode[] = []
  const body: MinimarkNode[] = []
  let inTitle = true
  for (const child of remaining) {
    if (!inTitle) {
      body.push(child)
    } else if (typeof child === 'string' && child.includes('\n')) {
      const cut = child.indexOf('\n')
      title.push(child.slice(0, cut))
      body.push(child.slice(cut + 1))
      inTitle = false
    } else {
      title.push(child)
    }
  }

  // Drop the fold marker and the space after the marker.
  if (typeof title[0] === 'string') title[0] = title[0].replace(/^[+-]?[ \t]*/, '')
  const titleNodes = title.filter((child) => child !== '')
  const hasTitle = titleNodes.some((child) => typeof child !== 'string' || child.trim())
  const bodyNodes = body.filter((child) => child !== '')
  const hasBody = bodyNodes.some((child) => !isBlank(child))

  return [
    'div',
    { class: `callout callout-${type}`, role: 'note' },
    ['p', { class: 'callout-title' }, ...(hasTitle ? titleNodes : [CALLOUT_TITLES[type] ?? type])],
    ...(hasBody ? [['p', { ...first[1] }, ...bodyNodes] as MinimarkElement] : []),
    ...blocks.slice(firstIndex + 1)
  ]
}

/* ---------------------------------------------------------------- figures */

const IMAGE_PROPS = ['src', 'alt', 'width', 'height']

/**
 * Two ways to write a figure:
 *
 *   ![Alt text](/images/a.png "Caption")          an image alone in its paragraph,
 *                                                  with a title
 *   ::figure{src="/images/a.png" alt="Alt text"}   a block, whose content is the
 *   Caption with **Markdown** and $math$.          caption
 *   ::
 *
 * Both become <figure><img><figcaption>. The first could not be done when
 * rendering: the image sits in a <p>, which cannot hold a <figure>.
 */
const toFigure = (node: MinimarkElement): MinimarkElement => {
  const [tag, props] = node

  if (tag === 'p') {
    const content = childrenOf(node).filter((child) => !isBlank(child))
    const image = content[0]
    if (content.length !== 1 || !isElement(image) || image[0] !== 'img') return node
    const { title, ...imageProps } = image[1]
    if (typeof title !== 'string' || !title.trim()) return node
    return ['figure', {}, ['img', imageProps], ['figcaption', {}, title.trim()]]
  }

  if (tag === 'figure' && typeof props.src === 'string') {
    const imageProps = Object.fromEntries(IMAGE_PROPS.filter((key) => key in props).map((key) => [key, props[key]]))
    const figureProps = Object.fromEntries(Object.entries(props).filter(([key]) => !IMAGE_PROPS.includes(key)))
    const content = childrenOf(node).filter((child) => !isBlank(child))
    // A one-paragraph caption is unwrapped: a <p> in a <figcaption> only adds margins.
    const caption = content.length === 1 && isElement(content[0]) && content[0][0] === 'p' ? childrenOf(content[0]) : content
    return [
      'figure',
      figureProps,
      ['img', imageProps],
      ...(caption.length ? [['figcaption', {}, ...caption] as MinimarkElement] : [])
    ]
  }

  return node
}

/* ---------------------------------------------------------------- footnotes */

/**
 * GFM footnotes. The back-reference arrow gets the text-style variation
 * selector, or iOS draws it as a colour emoji.
 */
const toFootnoteBackref = (node: MinimarkElement): MinimarkElement => {
  const [tag, props] = node
  if (tag !== 'a' || !classesOf(props).includes('data-footnote-backref')) return node
  return [tag, props, ...childrenOf(node).map((child) => (child === '↩' ? '↩︎' : child))]
}

/**
 * The visually hidden "Footnotes" heading is for screen readers. It stays out of
 * the table of contents, and renders as a plain <h2> (`__ignoreMap` skips the
 * ProseH2 component): as a permalink it was an invisible link in the tab order.
 */
const FOOTNOTE_LABEL_ID = 'footnote-label'

const toFootnoteLabel = (node: MinimarkElement): MinimarkElement => {
  const [tag, props] = node
  if (tag !== 'h2' || props.id !== FOOTNOTE_LABEL_ID) return node
  return [tag, { ...props, __ignoreMap: '' }, ...childrenOf(node)]
}

/* ---------------------------------------------------------------- inline math */

const OPENING_PUNCTUATION = /[([{“‘"'«（【《]+$/
const CLOSING_PUNCTUATION = /^[,.;:!?)\]}”’"'»%…，。；：！？）】》、]+/

const isInlineMath = (node: MinimarkNode): node is MinimarkElement =>
  isElement(node) && node[0] === 'span' && classesOf(node[1]).includes('katex')

/**
 * A formula is a single unbreakable box, so the line could break right after
 * it and start the next line with its comma, or leave an opening bracket at the
 * end of the line before it. The punctuation touching a formula joins it in a
 * no-wrap span.
 */
const glueMathPunctuation = (children: MinimarkNode[]): MinimarkNode[] => {
  if (!children.some(isInlineMath)) return children
  const list = [...children]
  const out: MinimarkNode[] = []
  list.forEach((child, index) => {
    if (!isInlineMath(child)) {
      out.push(child)
      return
    }
    let before = ''
    const previous = out[out.length - 1]
    if (typeof previous === 'string') {
      before = OPENING_PUNCTUATION.exec(previous)?.[0] ?? ''
      if (before) out[out.length - 1] = previous.slice(0, -before.length)
    }
    let after = ''
    const next = list[index + 1]
    if (typeof next === 'string') {
      after = CLOSING_PUNCTUATION.exec(next)?.[0] ?? ''
      if (after) list[index + 1] = next.slice(after.length)
    }
    out.push(
      before || after
        ? ['span', { class: 'nowrap' }, ...(before ? [before] : []), child, ...(after ? [after] : [])]
        : child
    )
  })
  return out.filter((child) => child !== '')
}

/* ---------------------------------------------------------------- walk */

const CODE_TAGS = new Set(['pre', 'code'])

const transformNode = (node: MinimarkNode): MinimarkNode => {
  if (!isElement(node)) return node
  let current = node
  if (current[0] === 'math' || current[0] === 'svg') return inlineForeignContent(current)
  if (current[0] === 'blockquote') current = toCallout(current)
  if (current[0] === 'p' || current[0] === 'figure') current = toFigure(current)
  current = toFootnoteBackref(toFootnoteLabel(current))
  const [tag, props] = current
  if (CODE_TAGS.has(tag)) return current
  return [tag, props, ...glueMathPunctuation(childrenOf(current).map(transformNode))]
}

export const transformBody = (body: MinimarkBody | undefined) => {
  if (!body?.value) return
  body.value = body.value.map(transformNode)
  if (body.toc?.links) body.toc.links = body.toc.links.filter((link) => link.id !== FOOTNOTE_LABEL_ID)
}
