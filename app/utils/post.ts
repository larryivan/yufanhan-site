import dayjs from 'dayjs'
import { SECTION_META, isPostSection } from '#shared/utils/sections'

/**
 * Post display helpers. Date formatting, section labels, cover URLs and cover
 * transition names used to be re-implemented per component and had drifted
 * (four date formats, "Tech" on cards but "Blog" everywhere else). The section
 * model itself lives in shared/utils/sections.ts, which the server uses too.
 */

export const sectionLabel = (section?: string | null) =>
  isPostSection(section) ? SECTION_META[section].label : ''

/**
 * The document title for a page title. A page titled like the site (or untitled)
 * gets just the site name, never "Yufan Han · Yufan Han". Shared by app.vue and
 * error.vue: Nuxt renders error.vue in place of app.vue, so it can't inherit it.
 */
export const siteTitle = (title: string | undefined, siteName: string) =>
  title && title !== siteName ? `${title} · ${siteName}` : siteName

/**
 * Calendar day of a frontmatter date as `YYYY-MM-DD`, or '' when absent/invalid.
 *
 * Only the date part is used: dates are calendar days, and formatting a UTC
 * midnight instant in a timezone behind UTC would show the previous day — on the
 * server, on the client, or both, which also breaks hydration.
 */
export const isoDate = (value?: string | Date | null): string => {
  if (!value) return ''
  const raw = value instanceof Date ? value.toISOString() : String(value)
  const day = raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
}

const DATE_FORMATS = {
  /** Everywhere a date is shown: Nov 2, 2024 */
  short: 'MMM D, YYYY'
} as const

export type DateStyle = keyof typeof DATE_FORMATS

export const formatDate = (value?: string | Date | null, style: DateStyle = 'short') => {
  const day = isoDate(value)
  // dayjs parses a bare YYYY-MM-DD as *local* midnight, so the formatted day is
  // the same calendar day in every timezone.
  return day ? dayjs(day).format(DATE_FORMATS[style]) : ''
}

/**
 * view-transition-name for a post's cover. Must be a valid CSS <custom-ident>:
 * characters such as '.', '(' or '!' in a slug would make the whole declaration
 * invalid and silently drop the morph.
 */
export const coverTransitionName = (path?: string | null) =>
  path ? `post-cover-${path.replace(/^\/+/, '').replace(/[^\w-]+/g, '-')}` : undefined

export interface CoverSources {
  src: string
  srcset?: string
  width: number
  height: number
}

const UNSPLASH = /^https:\/\/images\.unsplash\.com\//

/**
 * Responsive sources for a cover image cropped to `aspect` (width / height).
 * Unsplash URLs get server-side resizing and cropping; anything else (local
 * files, other hosts) is returned as-is. width/height are the intrinsic size of
 * `src`, for layout-shift-free rendering.
 */
export const coverSources = (
  url: string,
  { aspect, widths = [480, 800, 1200], fallback = 800 }: { aspect: number, widths?: number[], fallback?: number }
): CoverSources => {
  const width = fallback
  const height = Math.round(fallback / aspect)
  if (!UNSPLASH.test(url)) return { src: url, width, height }

  const at = (w: number) => {
    const u = new URL(url)
    u.searchParams.set('w', String(w))
    u.searchParams.set('h', String(Math.round(w / aspect)))
    u.searchParams.set('fit', 'crop')
    u.searchParams.set('auto', 'format')
    u.searchParams.set('q', '72')
    return u.toString()
  }

  return {
    src: at(fallback),
    srcset: widths.map(w => `${at(w)} ${w}w`).join(', '),
    width,
    height
  }
}
