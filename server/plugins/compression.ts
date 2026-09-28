import { createHash } from 'node:crypto'
import { ServerResponse } from 'node:http'
import { brotliCompressSync, constants, gzipSync } from 'node:zlib'
import { getRequestHeader } from 'h3'

/**
 * Compresses the responses rendered per request and gives them an ETag.
 *
 * `compressPublicAssets` covers only the files in .output/public. The archives (/blog
 * and /life with any ?tag= / ?page=), error pages and the API are rendered for each
 * request, and went out uncompressed (/blog: 24 KB, about 6 KB compressed) and with no
 * validator, so a revisit downloaded them in full again. With this, a bare
 * `node .output/server/index.mjs` needs no compressing proxy in front of it.
 */

type Encoding = 'br' | 'gzip'

const COMPRESSIBLE = /^(?:text\/|application\/(?:json|xml|rss\+xml|javascript)|image\/svg\+xml)/i
// Same threshold as compressPublicAssets: below it the encoding overhead eats the saving.
const MIN_BYTES = 1024

const encoders: Record<Encoding, (body: Uint8Array) => Buffer> = {
  // Quality 5 of 11: about 10% larger than the maximum for about 1% of its CPU time,
  // which every request pays here.
  br: body =>
    brotliCompressSync(body, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 5, [constants.BROTLI_PARAM_SIZE_HINT]: body.byteLength }
    }),
  gzip: body => gzipSync(body)
}

/** The preferred coding the client accepts, honouring `;q=0` and `*`. */
const negotiate = (header = ''): Encoding | undefined => {
  const weights = new Map<string, number>()
  for (const part of header.toLowerCase().split(',')) {
    const [name = '', ...params] = part.split(';').map(value => value.trim())
    const q = params.find(param => param.startsWith('q='))
    weights.set(name, q ? Number(q.slice(2)) : 1)
  }
  return (['br', 'gzip'] as const).find(name => (weights.get(name) ?? weights.get('*') ?? 0) > 0)
}

const opaqueTag = (tag: string) => tag.trim().replace(/^W\//, '')

/** If-None-Match uses the weak comparison. */
const isUnchanged = (ifNoneMatch: string | undefined, etag: string) =>
  !!ifNoneMatch && ifNoneMatch.split(',').some(tag => opaqueTag(tag) === '*' || opaqueTag(tag) === opaqueTag(etag))

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const res = event.node.res
    // In-process fetches must stay plain: Nuxt renders its error page through one and
    // reads the body back as text.
    if (!(res instanceof ServerResponse) || event.method === 'HEAD') return

    const encoding = negotiate(getRequestHeader(event, 'accept-encoding'))
    const ifNoneMatch = getRequestHeader(event, 'if-none-match')
    const end = res.end.bind(res) as (...args: unknown[]) => ServerResponse

    res.end = ((chunk?: unknown, ...args: unknown[]) => {
      const body = typeof chunk === 'string'
        ? Buffer.from(chunk, typeof args[0] === 'string' ? (args[0] as BufferEncoding) : 'utf8')
        : chunk instanceof Uint8Array ? chunk : undefined
      // Already streamed, served from .output/public (precompressed, with its own ETag),
      // or not text.
      if (
        !body
        || res.headersSent
        || res.hasHeader('etag')
        || res.hasHeader('content-encoding')
        || !COMPRESSIBLE.test(String(res.getHeader('content-type') ?? ''))
      ) {
        return end(chunk, ...args)
      }
      const callback = args.find(arg => typeof arg === 'function')
      const compressible = body.byteLength >= MIN_BYTES

      if (compressible) {
        const vary = String(res.getHeader('vary') ?? '')
        if (!/\baccept-encoding\b/i.test(vary)) res.setHeader('vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding')
      }

      if (res.statusCode === 200) {
        // Weak: one validator for the plain, gzip and brotli bodies alike.
        const etag = `W/"${createHash('sha1').update(body).digest('base64url')}"`
        res.setHeader('etag', etag)
        if (isUnchanged(ifNoneMatch, etag)) {
          res.statusCode = 304
          res.removeHeader('content-type')
          res.removeHeader('content-length')
          return end(callback)
        }
      }

      if (!compressible || !encoding) return end(chunk, ...args)
      const encoded = encoders[encoding](body)
      res.setHeader('content-encoding', encoding)
      res.setHeader('content-length', encoded.byteLength)
      return end(encoded, callback)
    }) as ServerResponse['end']
  })
})
