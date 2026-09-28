import katex from 'katex'
import readingTime from 'reading-time'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { parseDocument } from 'yaml'
import { z } from 'zod'
import { classesOf } from './content.transforms'
import type { MinimarkBody } from './content.transforms'
import { KATEX_MACROS, KATEX_OPTIONS } from './markdown.config'
import type { PostSection } from './shared/utils/sections'

/**
 * What a content file must look like, checked on its text alone: shared by the
 * build (modules/content-build.ts), which reads the files from disk, and the
 * editor's server routes (server/api/admin), which check a post before it is
 * committed. Both report the same problems in the same words.
 */

export interface Problem {
  /** The file's own line number, for a problem in the body. */
  line?: number
  /** The frontmatter field at fault, `slug` for the file name, `frontmatter` when it cannot be read. */
  field?: string
  message: string
}

/** One line of the build log: `line 12: formula …`, `date: expected …`, `file name: …`. */
export const formatProblem = ({ line, field, message }: Problem) => {
  if (line) return `line ${line}: ${message}`
  if (field) return `${field === 'slug' ? 'file name' : field}: ${message}`
  return message
}

/* ---------------------------------------------------------------- frontmatter */

export interface Frontmatter {
  /** Exactly what @nuxt/content reads (YAML 1.2), before any schema default. */
  frontmatter: Record<string, unknown>
  /**
   * Why the frontmatter does not read as written. @nuxt/content reports none of
   * these: it stores whatever data survives them.
   */
  frontmatterErrors: string[]
}

/**
 * Finds the block the way remark-mdc (and so @nuxt/content) does: a file that
 * starts with `---` opens it, whatever else is on that line, and it runs from the
 * fifth character to the first line that starts with `---`.
 */
export const readFrontmatter = (raw: string): Frontmatter => {
  // @nuxt/content turns CRLF into LF before remark-mdc sees the file.
  const source = raw.replace(/\r\n/g, '\n')
  if (!source.startsWith('---')) {
    // Anything before the opening `---`, even a blank line or a byte-order mark,
    // and remark-mdc reads no frontmatter at all: say so, rather than only that
    // every field is missing.
    const misplaced = source.trimStart().startsWith('---')
    return {
      frontmatter: {},
      frontmatterErrors: misplaced
        ? ['the opening --- line must come first: nothing may precede it, not even a blank line or a byte-order mark']
        : []
    }
  }
  const end = source.indexOf('\n---')
  if (end === -1) return { frontmatter: {}, frontmatterErrors: ['the closing --- line is missing'] }
  const block = source.slice(4, end)
  if (!block) return { frontmatter: {}, frontmatterErrors: [] }

  // A block that starts on line 2 gets a leading newline, so error positions
  // carry the file's own line numbers.
  const document = parseDocument(source[3] === '\n' ? `\n${block}` : block)
  const frontmatterErrors = document.errors.map((error) => (error.message.split('\n')[0] ?? '').replace(/:$/, ''))
  try {
    const data: unknown = document.toJSON()
    if (data == null) return { frontmatter: {}, frontmatterErrors }
    if (typeof data === 'object' && !Array.isArray(data)) {
      return { frontmatter: data as Record<string, unknown>, frontmatterErrors }
    }
    frontmatterErrors.push('expected a list of `key: value` fields')
  } catch (error) {
    frontmatterErrors.push(error instanceof Error ? error.message : String(error))
  }
  return { frontmatter: {}, frontmatterErrors }
}

/** Rejects a day that does not exist, such as 2024-02-30, instead of rolling it into March. */
const isCalendarDay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/**
 * YAML 1.2 keeps `2024-11-02` a string, and @nuxt/content stores it as that same
 * UTC day whatever the build machine's timezone. A time or an offset could move
 * it to the neighbouring day, so only the bare day is accepted.
 */
const calendarDay = z
  .string({ invalid_type_error: 'expected a date written YYYY-MM-DD' })
  .refine(isCalendarDay, 'expected a real date written YYYY-MM-DD')

const text = z.string().trim().min(1, 'must not be empty')

/**
 * What an author may write in a post's frontmatter. The section comes from the
 * directory: the field may repeat it but not contradict it, or the post would be
 * listed in one archive and served under the other's URL.
 */
export const postFrontmatter = (section: PostSection) =>
  z
    .object({
      title: text,
      description: text,
      date: calendarDay,
      updatedAt: calendarDay.optional(),
      section: z
        .literal(section, {
          errorMap: () => ({ message: `must be "${section}", the directory the file is in, or be left out` })
        })
        .optional(),
      tags: z.array(text).optional(),
      // A relative path would resolve against the post's own URL and 404.
      cover: z.string().regex(/^(https?:\/\/|\/)/, 'expected a full URL or a path starting with /').optional(),
      draft: z.boolean({ invalid_type_error: 'expected true or false' }).optional()
    })
    // A misspelt key would otherwise be dropped silently: `draf: true` publishes the draft.
    .strict()

export const pageFrontmatter = z
  .object({
    title: text,
    description: text,
    date: calendarDay.optional()
  })
  .strict()

/* ---------------------------------------------------------------- file names */

/**
 * A post's slug is its file name and its URL. @nuxt/content would slugify any
 * other name (and turn `index.md` into the archive's own path), so the page would
 * not be where the prerender list and every link expect it.
 */
export const POST_SLUG = /^(?!index$)[a-z0-9]+(?:-[a-z0-9]+)*$/

export const isPostSlug = (value: unknown): value is string => typeof value === 'string' && POST_SLUG.test(value)

/* ---------------------------------------------------------------- formulas */

interface MathNode {
  type: string
  value?: string
  position?: { start: { line: number } }
  children?: MathNode[]
}

const mathParser = unified().use(remarkParse).use(remarkGfm).use(remarkMath)

/**
 * Every formula in a Markdown file that KaTeX cannot render. On the page such a
 * formula shows as red source text, and nothing else reports it, so this parses
 * the file itself, like the frontmatter check. The frontmatter is blanked out
 * rather than cut, so line numbers stay those of the file.
 */
export const mathProblems = (source: string): Problem[] => {
  const text = source.replace(/\r\n/g, '\n')
  const end = text.startsWith('---') ? text.indexOf('\n---', 3) : -1
  const body = end === -1 ? text : text.slice(0, end + 4).replace(/[^\n]/g, ' ') + text.slice(end + 4)

  const problems: Problem[] = []
  const visit = (node: MathNode) => {
    if ((node.type === 'math' || node.type === 'inlineMath') && typeof node.value === 'string') {
      try {
        katex.renderToString(node.value, {
          ...KATEX_OPTIONS,
          // A copy per formula: \gdef writes into the object it is given.
          macros: { ...KATEX_MACROS },
          displayMode: node.type === 'math',
          throwOnError: true
        })
      } catch (error) {
        const message = (error instanceof Error ? error.message : String(error))
          .replace(/^KaTeX parse error: /, '')
          .replace(/ at position \d+:[\s\S]*$/, '')
        const formula = node.value.replace(/\s+/g, ' ').trim()
        const shown = formula.length > 48 ? `${formula.slice(0, 45)}...` : formula
        const fence = node.type === 'math' ? '$$' : '$'
        problems.push({ line: node.position?.start.line, message: `formula ${fence}${shown}${fence}: ${message}` })
      }
    }
    node.children?.forEach(visit)
  }
  visit(mathParser.parse(body) as MathNode)
  return problems
}

/* ---------------------------------------------------------------- one file */

/**
 * Everything wrong with one content file, from its text: a post when `section`
 * is given (with `slug`, its file name), a page otherwise. A frontmatter that
 * cannot be read is reported alone, since every field would look missing.
 */
export const contentProblems = (raw: string, post?: { section: PostSection, slug: string }): Problem[] => {
  const { frontmatter, frontmatterErrors } = readFrontmatter(raw)
  if (frontmatterErrors.length) return frontmatterErrors.map((message) => ({ field: 'frontmatter', message }))

  const problems: Problem[] = []
  if (post && !isPostSlug(post.slug)) {
    problems.push({ field: 'slug', message: 'must be a lowercase slug such as my-post.md, since it becomes the URL' })
  }

  const schema = post ? postFrontmatter(post.section) : pageFrontmatter
  schema.safeParse(frontmatter).error?.issues.forEach((issue) => {
    problems.push(
      issue.code === 'unrecognized_keys'
        ? { message: `${issue.keys.join(', ')}: not a known field` }
        : { field: issue.path.join('.'), message: issue.message }
    )
  })
  problems.push(...mathProblems(raw))
  return problems
}

/* ---------------------------------------------------------------- reading time */

const SKIPPED_TAGS = new Set(['code', 'pre', 'style', 'script'])

/**
 * Minimark stores an element as `[tag, props, ...children]` and a text node as
 * a bare string, so the walk has to handle both shapes. A formula counts as one
 * word: its rendered text is a heap of glyphs and spacing.
 */
const collectText = (node: unknown, out: string[]) => {
  if (typeof node === 'string') {
    out.push(node)
    return
  }
  if (!Array.isArray(node)) return

  const [tag, props, ...children] = node as [string, Record<string, unknown>, ...unknown[]]
  if (typeof tag === 'string' && SKIPPED_TAGS.has(tag)) return
  if (props && classesOf(props).includes('katex')) {
    out.push(' formula ')
    return
  }
  children.forEach((child) => collectText(child, out))
}

/** A post's `readingTime` (whole minutes, at least one) and `words`, from its parsed body. */
export const readingStats = (body: MinimarkBody | undefined) => {
  const chunks: string[] = []
  body?.value?.forEach((node) => collectText(node, chunks))
  const stats = readingTime(chunks.join(' '))
  return { readingTime: Math.max(1, Math.ceil(stats.minutes)), words: stats.words }
}
