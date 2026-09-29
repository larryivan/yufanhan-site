/**
 * Visitor statistics with Umami Cloud, counted first-party. The browser posts
 * to ANALYTICS_ENDPOINT on the site itself (app/plugins/analytics.client.ts);
 * the server passes each event on to Umami with the reader's own IP address
 * and browser (server/routes/_i/api/send.post.ts), which is what Umami derives
 * the visitor, the visit and the location from. Nothing on the page talks to
 * a third party, so blockers that stop umami.is do not skew the numbers.
 *
 * Shared so both sides clean URLs by the same rules.
 */

export const ANALYTICS_ENDPOINT = '/_i/api/send'

/** Set in a browser that has signed in to the editor: its visits are not counted. The key Umami's own docs use. */
export const ANALYTICS_OPT_OUT_KEY = 'umami.disabled'

/** The events recorded besides page views, by the name Umami shows. */
export const ANALYTICS_EVENTS = {
  readToEnd: 'Read to end',
  outboundLink: 'Outbound link',
  emailLink: 'Email link'
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

export const isAnalyticsEvent = (value: unknown): value is AnalyticsEvent =>
  Object.values(ANALYTICS_EVENTS).includes(value as AnalyticsEvent)

/**
 * The query parameters a page view keeps: the archives' filters, and the
 * campaign tags and ad click ids Umami reads to tell where a visit came from.
 * Everything else is dropped, a giscus session handed back after signing in to
 * comment among them.
 */
const PAGE_PARAMS = new Set(['tag', 'page'])
const CAMPAIGN_PARAMS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'])
/** Umami only asks whether an ad click brought the reader; the value is unique to that reader's click. */
const CLICK_IDS = new Set(['gclid', 'fbclid', 'msclkid', 'ttclid', 'li_fat_id', 'twclid'])

/** The hostnames that are counted, from their comma-separated setting. */
export const analyticsDomains = (value: unknown) =>
  String(value ?? '')
    .split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(Boolean)

/** The editor is never counted, whoever opens it. */
export const isCountedPath = (path: string) => !/^\/admin(?:[/?#]|$)/i.test(path)

/**
 * What a page view records of a URL: its path, without a trailing slash (the
 * same page is served at /blog/x and /blog/x/), and its kept query, never the
 * hash. `campaign: false` leaves out the campaign tags and click ids, which
 * belong to the view a reader landed on, not to every return to it.
 */
export const analyticsPath = (url: URL, { campaign = true } = {}) => {
  const kept = new URLSearchParams()
  for (const [key, value] of url.searchParams) {
    if (PAGE_PARAMS.has(key)) kept.append(key, value)
    else if (campaign && CAMPAIGN_PARAMS.has(key)) kept.append(key, value)
    else if (campaign && CLICK_IDS.has(key)) kept.set(key, '1')
  }
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') || '/' : url.pathname
  const query = kept.toString()
  return path + (query ? `?${query}` : '')
}

/**
 * Where a view came from. Another page of the site: its recorded path, as for
 * a page view. Another site: its address without query or hash, which only
 * carry search terms and session ids. An Android app (the Google app,
 * Discover, Gmail): its package name, which Umami sorts into channels.
 * Anything else: nothing.
 */
export const analyticsReferrer = (value: unknown, origin: string) => {
  if (typeof value !== 'string' || !value) return ''
  let url: URL
  try {
    url = new URL(value, origin)
  } catch {
    return ''
  }
  if (url.origin === origin) return analyticsPath(url, { campaign: false })
  if (url.protocol === 'https:' || url.protocol === 'http:') return `${url.origin}${url.pathname}`
  return url.protocol === 'android-app:' && url.host ? `android-app://${url.host}/` : ''
}
