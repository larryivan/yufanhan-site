import type { H3Event } from 'h3'

const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&apos;' }

// Characters XML 1.0 forbids outright. One of them in a frontmatter string would
// otherwise make the whole feed malformed for every reader.
// eslint-disable-next-line no-control-regex
const XML_INVALID = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

export const escapeXml = (value: unknown) =>
  String(value ?? '').replace(XML_INVALID, '').replace(/[&<>"']/g, ch => escapes[ch]!)

/** Site origin without a trailing slash (SITE_URL at build time). */
export const siteOrigin = (event: H3Event) =>
  String(useRuntimeConfig(event).public.siteUrl || '').replace(/\/+$/, '')

// Same rule as app/composables/useSeo.ts: a build without a public SITE_URL
// falls back to localhost, which must never be advertised to crawlers.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

export const isPublicOrigin = (origin: string) => !!origin && !LOCAL_ORIGIN.test(origin)

/** Calendar day of a stored content date, or '' — same rule as app/utils/post.ts. */
export const dayOf = (value: unknown) => {
  const raw = value instanceof Date ? value.toISOString() : String(value ?? '')
  const day = raw.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
}
