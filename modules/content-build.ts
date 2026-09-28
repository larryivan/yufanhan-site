import { readFileSync, watch } from 'node:fs'
import { join, sep } from 'node:path'
import { defineNuxtModule, useLogger } from 'nuxt/kit'
import { POST_SECTIONS, readContentFiles } from '../content.schema'
import type { ContentEntry } from '../content.schema'
import { transformBody } from '../content.transforms'
import type { MinimarkBody } from '../content.transforms'
import { contentProblems, formatProblem, readingStats } from '../content.validation'

const problemsOf = (entry: ContentEntry, contentDir: string): string[] => {
  if (!entry.collection) {
    const sections = POST_SECTIONS.map((section) => `content/${section}/`).join(' or ')
    return [`no collection reads it: posts go directly in ${sections}, pages directly in content/`]
  }
  const raw = readFileSync(join(contentDir, entry.file), 'utf8')
  const post = entry.section ? { section: entry.section, slug: entry.file.slice(entry.section.length + 1, -3) } : undefined
  return contentProblems(raw, post).map(formatProblem)
}

/** Problems per file, for every Markdown file under content/ (none for a valid one). */
const validate = (contentDir: string) =>
  new Map(readContentFiles(contentDir).map((entry) => [entry.file, problemsOf(entry, contentDir)] as const))

/**
 * Drafts are left out of production builds (content.config.ts), so a half-written
 * one must not stop the rest of the site from deploying: its problems are warned
 * about and checked again when it is published (the editor refuses to publish a
 * post with problems). A draft whose frontmatter cannot be read is not known to be
 * one, and fails the build like any other file.
 */
const isDraft = (entry: ContentEntry) => entry.collection === 'posts' && entry.frontmatter.draft === true

const describe = (invalid: [string, string[]][]) =>
  invalid
    .map(([file, problems]) => [`  content/${file}`, ...problems.map((problem) => `    ${problem}`)].join('\n'))
    .join('\n')

/**
 * Two build-time passes:
 *
 *  1. enrich   — while @nuxt/content parses a file, rewrite its body
 *                (callouts, figures, formulas: see content.transforms.ts) and,
 *                for a post, derive `section` from its directory and compute
 *                `readingTime` / `words` once, so no request pays for them.
 *  2. validate — check every file's raw frontmatter against the schemas in
 *                content.validation.ts, and every formula in it against KaTeX.
 *
 * Validation reads the files from disk rather than hooking the parser, because
 * @nuxt/content skips parsing (and its hooks) for every file its cache already
 * holds, even across a build that failed. Without this pass a typo like
 * `date: 2024-1-5` or `draf: true` fails silently: the column schema only drives
 * SQL types. A production build fails on any problem outside a draft; `nuxt dev`
 * reports them at startup and again whenever a file under content/ changes.
 */
export default defineNuxtModule({
  meta: { name: 'content-build', configKey: 'contentBuild' },
  setup(_options, nuxt) {
    nuxt.hook('content:file:afterParse', (ctx) => {
      if (!ctx.file.id.endsWith('.md')) return

      const body = ctx.content.body as MinimarkBody | undefined
      transformBody(body)

      if (ctx.collection.name !== 'posts') return

      // The first segment of the URL, i.e. the directory: the archive a post is
      // listed in can never disagree with where it is served.
      ctx.content.section = String(ctx.content.path).split('/')[1]

      const { readingTime, words } = readingStats(body)
      ctx.content.readingTime = readingTime
      ctx.content.words = words
    })

    // `nuxt prepare` (postinstall) and typecheck build nothing.
    if (nuxt.options._prepare) return

    const contentDir = join(nuxt.options.rootDir, 'content')

    nuxt.hook('build:before', () => {
      const logger = useLogger('content')

      if (!nuxt.options.dev) {
        const drafts = new Set(readContentFiles(contentDir).filter(isDraft).map((entry) => entry.file))
        const invalid = [...validate(contentDir)].filter(([, problems]) => problems.length)
        const invalidDrafts = invalid.filter(([file]) => drafts.has(file))
        if (invalidDrafts.length) {
          logger.warn(`Drafts with problems (left out of this build, fix before publishing):\n${describe(invalidDrafts)}`)
        }
        const fatal = invalid.filter(([file]) => !drafts.has(file))
        if (fatal.length) throw new Error(`[content] Invalid content:\n${describe(fatal)}`)
        return
      }

      // Last problems reported per file, to print only what changed or was just saved.
      let reported = new Map<string, string>()
      const report = (touched: Set<string>) => {
        const results = validate(contentDir)
        const invalid = [...results].filter(
          ([file, problems]) =>
            problems.length && (touched.has(file) || reported.get(file) !== problems.join('\n'))
        )
        const fixed = [...reported.keys()].filter((file) => results.get(file)?.length === 0)

        if (invalid.length) {
          logger.warn(`Invalid content (a production build fails on it, except in a draft):\n${describe(invalid)}`)
        }
        fixed.forEach((file) => logger.success(`content/${file} is valid again`))

        reported = new Map(
          [...results]
            .filter(([, problems]) => problems.length)
            .map(([file, problems]) => [file, problems.join('\n')] as const)
        )
      }

      report(new Set())

      let touched = new Set<string>()
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        const watcher = watch(contentDir, { recursive: true }, (_event, filename) => {
          if (filename) touched.add(String(filename).split(sep).join('/'))
          clearTimeout(timer)
          // One save fires several events: read the files once they settle.
          timer = setTimeout(() => {
            report(touched)
            touched = new Set()
          }, 100)
        })
        watcher.on('error', (error) => {
          logger.warn(`Stopped checking content/ for changes: ${error.message}`)
          watcher.close()
        })
        nuxt.hook('close', () => {
          clearTimeout(timer)
          watcher.close()
        })
      } catch (error) {
        logger.warn(`Cannot watch content/: ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }
})
