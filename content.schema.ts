import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import type { Dirent } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { z } from '@nuxt/content'
import { readFrontmatter } from './content.validation'
import type { Frontmatter } from './content.validation'

/**
 * The content model, shared by content.config.ts (collections and SQL column
 * types) and modules/content-build.ts (enrichment and validation), so both
 * agree on which files exist. What their frontmatter must look like is in
 * content.validation.ts, which the editor's server routes use as well.
 */

/** A post lives directly in content/<section>/ and is served at /<section>/<file name>. */
import { POST_SECTIONS, isPostSection } from './shared/utils/sections'
import type { PostSection } from './shared/utils/sections'

export { POST_SECTIONS }
export type { PostSection }

/** A name starting with `_` is a scratch file, and `.` belongs to editors and the OS: neither is content. */
const IGNORED_NAME = /^[_.]/

/** The same rule as collection-source globs, for the files directly in `dir`. */
export const ignoredGlobs = (dir?: string) => ['_*', '.*'].map((glob) => (dir ? `${dir}/${glob}` : glob))

/**
 * Column schemas: content.config.ts turns them into SQL column types. @nuxt/content
 * does not validate against them (a bad enum lands in its column verbatim, and a
 * non-boolean `draft` is coerced with `!!`); modules/content-build.ts enforces the
 * frontmatter schemas in content.validation.ts instead.
 */
export const postSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.date(),
  updatedAt: z.date().optional(),
  // Set from the file's directory by modules/content-build.ts.
  section: z.enum(POST_SECTIONS),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
  // Computed from the body by modules/content-build.ts.
  readingTime: z.number().default(1),
  words: z.number().default(0)
})

export const pageSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.date().optional()
})

export interface ContentEntry extends Frontmatter {
  /** Relative to content/, with `/` separators: `blog/hello.md`. */
  file: string
  /** Undefined when the file sits where no collection reads it. */
  collection?: 'posts' | 'pages'
  section?: PostSection
}

/** What a symbolic link points to, or undefined when it is broken. */
const linkTarget = (path: string) => {
  try {
    return statSync(path)
  } catch {
    return undefined
  }
}

/**
 * The Markdown files under `dir` whose names are not ignored, relative to `root`
 * with `/` separators. @nuxt/content lists sources with a globber that follows
 * symbolic links, so a link counts as what it points to: a post linked in from
 * elsewhere is published like any other, and must be validated and, as a draft,
 * excluded. Like the globber, this skips broken links and unreadable directories.
 */
const markdownFiles = (root: string, dir: string, ancestors: ReadonlySet<string>): string[] => {
  let real: string
  let entries: Dirent[]
  try {
    real = realpathSync(dir)
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
  // A link back up the tree would otherwise be followed forever.
  if (ancestors.has(real)) return []
  const inside = new Set(ancestors).add(real)

  return entries.flatMap((entry) => {
    if (IGNORED_NAME.test(entry.name)) return []
    const path = join(dir, entry.name)
    const target = entry.isSymbolicLink() ? linkTarget(path) : entry
    if (target?.isDirectory()) return markdownFiles(root, path, inside)
    return target?.isFile() && entry.name.endsWith('.md') ? [relative(root, path).split(sep).join('/')] : []
  })
}

/**
 * Every Markdown file under content/ except ignored ones, read straight from disk:
 * unlike @nuxt/content's parse hooks, this does not skip files its cache holds.
 */
export const readContentFiles = (contentDir: string): ContentEntry[] =>
  markdownFiles(contentDir, contentDir, new Set())
    .sort()
    .map((file) => {
      const parts = file.split('/')
      const [dir = ''] = parts
      const location =
        parts.length === 1
          ? { collection: 'pages' as const }
          : parts.length === 2 && isPostSection(dir)
            ? { collection: 'posts' as const, section: dir }
            : {}
      return { file, ...location, ...readFrontmatter(readFileSync(join(contentDir, file), 'utf8')) }
    })
