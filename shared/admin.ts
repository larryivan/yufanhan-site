import type { PostSection } from './utils/sections'

/**
 * The editor (app/pages/admin, server/api/admin): what its pages and server routes
 * exchange, and the rules both sides check. Not in shared/utils, so nothing here
 * is auto-imported into the site itself.
 */

/** The frontmatter fields the editor has a control for; `extra` keeps any others as found. */
export interface PostMeta {
  title: string
  description: string
  /** YYYY-MM-DD */
  date: string
  /** YYYY-MM-DD, or '' when absent. */
  updatedAt: string
  tags: string[]
  /** A full URL or a path starting with /, or '' when absent. */
  cover: string
  draft: boolean
  extra: Record<string, unknown>
}

export interface Problem {
  /** A line of the body as the editor shows it, for a problem in the body. */
  line?: number
  /** The field at fault: a frontmatter key, or `slug` for the URL. */
  field?: string
  message: string
}

export interface PostSummary {
  /** In the repository: content/blog/my-post.md */
  path: string
  section: PostSection
  slug: string
  /** Git blob SHA, to tell whether the file changed since it was opened. */
  sha: string
  title: string
  description: string
  date: string
  draft: boolean
  tags: string[]
}

export interface EditorPost extends PostSummary {
  meta: PostMeta
  body: string
  problems: Problem[]
}

/** A post rendered as the article page receives it (see server/admin/render.ts). */
export interface PreviewPost {
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
  body: { type: 'minimark', value: unknown[], toc?: { links?: unknown[] } }
}

export interface PreviewResult {
  post: PreviewPost
  problems: Problem[]
}

export interface SaveResult {
  path: string
  sha: string
  commit: string
  /** Whether the commit changes the live site, and so starts a deploy. */
  deploy: boolean
}

export type DeployState = 'live' | 'building' | 'failed' | 'unknown'

export interface AdminSession {
  /** local: files on this computer (`npm run dev` only). github: commits to the repository. */
  storage: 'local' | 'github'
  user: { login: string, name?: string, avatar?: string } | null
  repo?: string
  /** What is missing before signing in can work, as environment variables to set. */
  setup: string[]
}

/* ---------------------------------------------------------------- uploads */

/** Vercel refuses request bodies over 4.5 MB. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export type MediaKind = 'images' | 'files'

/**
 * public/images/<slug>/ and public/files/<slug>/ hold a post's uploads, served at
 * /images/<slug>/… and /files/<slug>/…. Names are lowercase with a content hash,
 * so a replaced file is a new URL: `gel-3f9a2c1d.webp`, `counts-0b1c2d3e.tar.gz`.
 */
export const MEDIA_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]{1,8}(?:\.(?:gz|bz2|xz))?$/

const IMAGE_TYPES: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml'
}

/**
 * Attachments: documents, data and code. Nothing a browser would run as a page
 * (HTML, scripts) — the files are served from the site's own origin.
 */
const FILE_EXTENSIONS = new Set([
  ...Object.keys(IMAGE_TYPES),
  'pdf', 'txt', 'md', 'csv', 'tsv', 'json', 'yaml', 'yml', 'toml',
  'zip', 'gz', 'tgz', 'tar', 'bz2', 'xz', '7z',
  'py', 'r', 'rmd', 'ipynb', 'sh', 'nf', 'smk', 'wdl', 'sql', 'tex', 'bib',
  'xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'odt', 'ods', 'odp', 'key', 'numbers', 'pages',
  'fa', 'fasta', 'fna', 'faa', 'fq', 'fastq', 'vcf', 'bed', 'gff', 'gff3', 'gtf', 'sam', 'nwk', 'newick', 'tre', 'phy', 'nex',
  'mp3', 'm4a', 'wav', 'mp4', 'mov', 'webm'
])

/** `tar` for counts-0b1c2d3e.tar.gz: the extension that says what the file is. */
export const mediaExtension = (name: string) => {
  const parts = name.toLowerCase().split('.')
  const last = parts.at(-1) ?? ''
  return ['gz', 'bz2', 'xz'].includes(last) && parts.length > 2 ? (parts.at(-2) ?? '') : last
}

export const isAllowedMedia = (kind: MediaKind, name: string) => {
  if (!MEDIA_NAME.test(name)) return false
  const extension = mediaExtension(name)
  return kind === 'images' ? extension in IMAGE_TYPES : FILE_EXTENSIONS.has(extension)
}

export const imageType = (name: string) => IMAGE_TYPES[mediaExtension(name)]

/** The site URL of a post's upload: /images/<slug>/<name>. */
export const mediaUrl = (kind: MediaKind, slug: string, name: string) => `/${kind}/${slug}/${name}`
