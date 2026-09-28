import type { Highlighter } from '@nuxtjs/mdc'
import { parseMarkdown, rehypeHighlight } from '@nuxtjs/mdc/runtime'
import highlighter from '#mdc-highlighter'
import type { Element, ElementContent } from 'hast'
import type { Link } from 'mdast'
import type { State } from 'mdast-util-to-hast'
import { normalizeUri } from 'micromark-util-sanitize-uri'
import { fromHast } from 'minimark/hast'
import { hash } from 'ohash'
import rehypeKatex from 'rehype-katex'
import remarkEmoji from 'remark-emoji'
import remarkMath from 'remark-math'
import slugify from 'slugify'
import { isRelative } from 'ufo'
import { visit } from 'unist-util-visit'
import { transformBody } from '../../content.transforms'
import type { MinimarkBody, MinimarkNode } from '../../content.transforms'
import { readingStats } from '../../content.validation'
import { CODE_THEMES, KATEX_MACROS, KATEX_OPTIONS, MARKDOWN_TOC } from '../../markdown.config'
import type { PostSection } from '#shared/utils/sections'

/**
 * The editor's preview: a post's Markdown, parsed exactly as the build parses it,
 * into the document the article page renders.
 *
 * At build time @nuxt/content parses each file with @nuxtjs/mdc's parseMarkdown
 * (options assembled in its createParser and markdown transformer), converts the
 * result to minimark, and then modules/content-build.ts rewrites the body. This
 * repeats those steps with the same plugins, options and code highlighter, so what
 * the editor shows is what the page will show. The copies of @nuxt/content
 * internals below are marked; they follow @nuxt/content 3.16.
 */

/** @nuxt/content's `link` handler: a relative link to a .md file becomes its route. */
const SEMVER = /^\d+(?:\.\d+)*(?:\.x)?$/
const refineUrlPart = (part: string) => {
  const name = part.split(/[/:]/).pop() ?? ''
  if (SEMVER.test(name)) return name
  return name.replace(/(\d+\.)?(.*)/, '$2').replace(/^index(\.draft)?$/, '').replace(/\.draft$/, '')
}
const generatePath = (path: string) => path.split('/').map((part) => slugify(refineUrlPart(part), {})).join('/')
const normaliseLink = (url: string) => {
  const hashPart = url.match(/#.+$/)?.[0] ?? ''
  if (url.replace(/#.+$/, '').endsWith('.md') && (isRelative(url) || (!/^https?/.test(url) && !url.startsWith('/')))) {
    return generatePath(url.replace(`.md${hashPart}`, '')) + hashPart
  }
  return url
}
const link = (state: State, node: Link & { attributes?: Record<string, unknown> }) => {
  const properties: Record<string, unknown> = { ...(node.attributes || {}), href: normalizeUri(normaliseLink(node.url)) }
  if (node.title !== null && node.title !== undefined) properties.title = node.title
  const result: Element = {
    type: 'element',
    tagName: 'a',
    properties: properties as Element['properties'],
    children: state.all(node) as ElementContent[]
  }
  state.patch(node, result)
  return state.applyData(node, result)
}

/**
 * @nuxt/content's highlight plugin with `compress: true`: each token's inline style
 * becomes a class named after a hash of it, and the rules join the page's <style>.
 */
const compressedHighlighter: Highlighter = async (code, lang, theme, options) => {
  const result = await highlighter(code, lang, theme, options)
  const stylesMap: Record<string, string> = {}
  visit(
    { type: 'element', tagName: 'div', properties: {}, children: result.tree } as Element,
    (node) => Boolean((node as Element).properties?.style),
    (node) => {
      const properties = (node as Element).properties
      const style = String(properties.style)
      stylesMap[style] = stylesMap[style] || `s${hash(style).substring(0, 4)}`
      properties.class = `${properties.class || ''} ${stylesMap[style]}`.trim()
      properties.style = undefined
    }
  )
  result.style =
    Object.entries(stylesMap)
      .map(([style, cls]) => `html pre.shiki code .${cls}, html code.shiki .${cls}{${style}}`)
      .join('') + (result.style ?? '')
  return result
}

/** The options @nuxt/content hands parseMarkdown for a file in a `page` collection. */
const parserOptions = () => ({
  compress: true,
  toc: MARKDOWN_TOC,
  contentHeading: true,
  remark: {
    plugins: {
      'remark-emoji': { instance: remarkEmoji, options: {} },
      'remark-math': { instance: remarkMath, options: {} }
    }
  },
  rehype: {
    plugins: {
      // A fresh macro table per parse: \gdef writes into the one it is given.
      'rehype-katex': { instance: rehypeKatex, options: { ...KATEX_OPTIONS, macros: { ...KATEX_MACROS } } },
      highlight: { instance: rehypeHighlight, options: { highlighter: compressedHighlighter, theme: CODE_THEMES } }
    },
    options: { handlers: { link } }
  }
})

export interface RenderedPost {
  path: string
  section: PostSection
  title: string
  description: string
  date?: string
  updatedAt?: string
  tags: string[]
  cover?: string
  draft: boolean
  readingTime: number
  words: number
  body: MinimarkBody & { type: 'minimark', value: MinimarkNode[] }
}

const optionalString = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

/** A post's file, rendered as the article page receives it from the content database. */
export const renderPost = async (raw: string, { section, slug }: { section: PostSection, slug: string }) => {
  const id = `posts/${section}/${slug}.md`
  const parsed = await parseMarkdown(raw, parserOptions() as Parameters<typeof parseMarkdown>[1], {
    fileOptions: { path: id }
  })

  // The markdown transformer's compressed result...
  const body = { ...fromHast(parsed.body as Parameters<typeof fromHast>[0]), toc: parsed.toc } as RenderedPost['body']
  // ...rewritten as modules/content-build.ts rewrites it.
  transformBody(body)

  const data = parsed.data as Record<string, unknown>
  const post: RenderedPost = {
    path: `/${section}/${slug}`,
    section,
    title: optionalString(data.title) ?? '',
    description: optionalString(data.description) ?? '',
    date: optionalString(data.date),
    updatedAt: optionalString(data.updatedAt),
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    cover: optionalString(data.cover),
    draft: data.draft === true,
    ...readingStats(body),
    body
  }
  return post
}
