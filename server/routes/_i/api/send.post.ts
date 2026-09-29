import { isIP } from 'node:net'
import type { H3Event } from 'h3'
import { getRequestHeader, getRequestHost, readRawBody, setResponseStatus } from 'h3'

/**
 * Passes the site's analytics events on to Umami Cloud (see
 * shared/utils/analytics.ts), each with the reader's own IP address and
 * browser. Umami derives the visitor, the visit and the location from those;
 * without them every reader would be one visitor in the region this function
 * runs in, and Umami would drop the events as coming from a bot (the fetch's
 * own user agent). Only well-formed page views and the site's own events for
 * its own hostnames are passed on, rebuilt field by field. Responses are never
 * cached or indexed (routeRules '/_i/**').
 */

const UMAMI = 'https://gateway.umami.is/api/send'
const MAX_BODY = 8 * 1024
const TIMEOUT = 8_000

/** A request that is not counted: accepted, with nothing to say. */
const quiet = (event: H3Event) => {
  setResponseStatus(event, 202)
  return {}
}

/**
 * The reader's address, bare: Umami looks up `::ffff:1.2.3.4` and `[1:2::3]:443`
 * as nothing. Vercel sets these headers itself and overwrites any a client
 * sends, so they cannot be forged.
 */
const readerIp = (event: H3Event) => {
  const raw =
    getRequestHeader(event, 'x-real-ip') ||
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0] ||
    event.node.req.socket?.remoteAddress ||
    ''
  let ip = raw.trim()
  if (ip.startsWith('[')) ip = ip.slice(1, ip.indexOf(']'))
  else if (/^[\d.]+:\d+$/.test(ip)) ip = ip.slice(0, ip.lastIndexOf(':'))
  if (/^::ffff:[\d.]+$/i.test(ip)) ip = ip.slice(7)
  return isIP(ip) ? ip : ''
}

const CONTROL = /\p{Cc}/gu

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(CONTROL, '').trim().slice(0, max) : ''

const match = (value: unknown, pattern: RegExp) => (typeof value === 'string' && pattern.test(value) ? value : '')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { websiteId, domains } = config.public.analytics
  const host = String(getRequestHost(event, { xForwardedHost: true }) || '')
    .toLowerCase()
    .replace(/:\d+$/, '')
  // Local development and preview deployments are not counted.
  if (!websiteId || !analyticsDomains(domains).includes(host)) return quiet(event)

  const userAgent = text(getRequestHeader(event, 'user-agent'), 1000)
  const ip = readerIp(event)
  if (!userAgent || !ip) return quiet(event)

  if (Number(getRequestHeader(event, 'content-length') || 0) > MAX_BODY) return quiet(event)
  const raw = await readRawBody(event, 'utf8').catch(() => undefined)
  if (!raw || raw.length > MAX_BODY) return quiet(event)
  let body: { type?: unknown, payload?: Record<string, unknown> } | null
  try {
    body = JSON.parse(raw)
  } catch {
    return quiet(event)
  }
  const sent = body?.type === 'event' && body.payload && typeof body.payload === 'object' ? body.payload : null
  if (!sent) return quiet(event)

  // The page, as the path the site's tracker sends.
  const url = text(sent.url, 2000)
  if (!url.startsWith('/') || url.startsWith('//')) return quiet(event)
  const origin = `https://${host}`
  let page: URL
  try {
    page = new URL(url, origin)
  } catch {
    return quiet(event)
  }
  if (page.origin !== origin || !isCountedPath(page.pathname)) return quiet(event)

  const payload: Record<string, unknown> = {
    website: websiteId,
    hostname: host,
    url: analyticsPath(page),
    referrer: analyticsReferrer(text(sent.referrer, 2000), origin),
    title: text(sent.title, 500),
    screen: match(sent.screen, /^\d{1,5}x\d{1,5}$/),
    language: match(sent.language, /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,3}$/),
    ip,
    userAgent
  }

  // A page view carries no name; an event only one of the site's own.
  if (sent.name !== undefined) {
    if (!isAnalyticsEvent(sent.name)) return quiet(event)
    payload.name = sent.name
    if (sent.name === ANALYTICS_EVENTS.outboundLink) {
      const link = analyticsReferrer(text((sent.data as { url?: unknown } | undefined)?.url, 2000), origin)
      if (!/^https?:\/\//.test(link)) return quiet(event)
      payload.data = { url: link.slice(0, 500) }
    }
  }

  // Umami's token for the visit so far, handed back with the next event.
  const cache = match(getRequestHeader(event, 'x-umami-cache'), /^[\w-]{1,1024}\.[\w-]{1,4096}\.[\w-]{1,1024}$/)
  // Tests point this at a stand-in; a production build always talks to Umami.
  const upstream = (import.meta.dev && String(config.analytics?.upstream || '')) || UMAMI

  const response = await fetch(upstream, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'user-agent': userAgent,
      'x-umami-website-id': String(websiteId),
      'x-umami-hostname': host,
      ...(cache ? { 'x-umami-cache': cache } : {})
    },
    body: JSON.stringify({ type: 'event', payload }),
    signal: AbortSignal.timeout(TIMEOUT)
  }).catch(() => null)
  if (!response) {
    setResponseStatus(event, 502)
    return {}
  }

  const data = (await response.json().catch(() => null)) as { cache?: unknown, disabled?: unknown } | null
  setResponseStatus(event, response.ok ? 200 : response.status)
  return {
    ...(typeof data?.cache === 'string' ? { cache: data.cache } : {}),
    ...(data?.disabled === true ? { disabled: true } : {})
  }
})
