import { createHash } from 'node:crypto'
import { stringify } from 'yaml'
import { isPostSlug, readFrontmatter } from '../../content.validation'
import type { MediaKind, PostMeta } from '#shared/admin'
import { isAllowedMedia } from '#shared/admin'
import { POST_SECTIONS, isPostSection } from '#shared/utils/sections'
import type { PostSection } from '#shared/utils/sections'

/**
 * A post as a file: where it lives in the repository, and its text as frontmatter
 * plus body. The frontmatter is written the way the existing posts are, so an
 * edit in the editor shows up in `git diff` as the lines that changed.
 */

export const postPath = (section: PostSection, slug: string) => `content/${section}/${slug}.md`

export const parsePostPath = (path: string) => {
  const match = /^content\/([a-z]+)\/([^/]+)\.md$/.exec(path)
  const [, section, slug] = match ?? []
  return isPostSection(section) && isPostSlug(slug) ? { section, slug } : null
}

/** The directories a post's uploads go in. */
export const mediaDirs = (slug: string) => (['images', 'files'] as const).map((kind) => `public/${kind}/${slug}/`)

/** An upload's repository path, when it is one of `slug`'s. */
export const isMediaPath = (path: string, slug: string) => {
  const match = /^public\/(images|files)\/([^/]+)\/([^/]+)$/.exec(path)
  const [, kind, folder, name] = match ?? []
  return Boolean(kind && name && folder === slug && isAllowedMedia(kind as MediaKind, name))
}

/** Everything the editor may write: posts and their uploads, never the site's own code. */
export const isManagedPath = (path: string) =>
  POST_SECTIONS.some((section) => path.startsWith(`content/${section}/`)) ||
  path.startsWith('public/images/') ||
  path.startsWith('public/files/')

/** Git's name for a file's content, so a local file and a GitHub blob compare alike. */
export const gitBlobSha = (bytes: Uint8Array) =>
  createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex')

/* ---------------------------------------------------------------- frontmatter */

/** Fields the editor writes itself. `section` is the directory's: never written. */
const OWN_FIELDS = new Set(['title', 'description', 'date', 'updatedAt', 'section', 'tags', 'cover', 'draft'])

/** Plain when YAML reads it back as the same text, quoted otherwise. */
const scalar = (value: string) => (/[\n\r]/.test(value) ? JSON.stringify(value) : stringify(value, { lineWidth: 0 }).trimEnd())

/** A calendar day stays bare, as in the existing posts; anything else is quoted, and the check reports it. */
const day = (value: string) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : JSON.stringify(value))

/**
 * A post's file text. Returns the line the body starts on, so a problem the check
 * reports by file line can be shown on the editor's line.
 */
export const composePost = (meta: PostMeta, body: string) => {
  const lines = [
    '---',
    `title: ${JSON.stringify(meta.title.trim())}`,
    `description: ${JSON.stringify(meta.description.trim())}`,
    `date: ${day(meta.date)}`
  ]
  if (meta.updatedAt) lines.push(`updatedAt: ${day(meta.updatedAt)}`)
  const tags = meta.tags.map((tag) => tag.trim()).filter(Boolean)
  if (tags.length) lines.push('tags:', ...tags.map((tag) => `  - ${scalar(tag)}`))
  if (meta.cover.trim()) lines.push(`cover: ${scalar(meta.cover.trim())}`)
  for (const [key, value] of Object.entries(meta.extra)) {
    if (!OWN_FIELDS.has(key)) lines.push(stringify({ [key]: value }, { lineWidth: 0 }).trimEnd())
  }
  lines.push(`draft: ${meta.draft}`, '---', '')

  const text = body.replace(/\r\n?/g, '\n').replace(/^\n+/, '').trimEnd()
  const head = lines.join('\n')
  return { raw: `${head}\n${text}\n`, bodyLine: head.split('\n').length + 1 }
}

const text = (value: unknown) => (typeof value === 'string' ? value : value == null ? '' : String(value))

/**
 * A post's file text as editor fields. Values of the wrong type are turned into
 * text rather than dropped (the check has already reported them), so saving the
 * post writes them back in the right form.
 */
export const splitPost = (raw: string) => {
  const source = raw.replace(/\r\n/g, '\n')
  const { frontmatter, frontmatterErrors } = readFrontmatter(source)

  // The body starts after the closing --- line, as remark-mdc reads it.
  let body = source
  let bodyLine = 1
  const end = source.startsWith('---') ? source.indexOf('\n---') : -1
  if (end !== -1) {
    const close = source.indexOf('\n', end + 4)
    body = close === -1 ? '' : source.slice(close + 1)
    bodyLine = source.slice(0, close === -1 ? source.length : close + 1).split('\n').length
  }
  // The blank line after the frontmatter is layout, not content.
  if (body.startsWith('\n')) {
    body = body.slice(1)
    bodyLine += 1
  }

  const tags = frontmatter.tags
  const extra = Object.fromEntries(Object.entries(frontmatter).filter(([key]) => !OWN_FIELDS.has(key)))
  const meta: PostMeta = {
    title: text(frontmatter.title),
    description: text(frontmatter.description),
    date: text(frontmatter.date),
    updatedAt: text(frontmatter.updatedAt),
    tags: Array.isArray(tags) ? tags.map(text).filter(Boolean) : tags == null ? [] : [text(tags)],
    cover: text(frontmatter.cover),
    draft: frontmatter.draft === true,
    extra
  }
  return { meta, body, bodyLine, frontmatterErrors }
}
