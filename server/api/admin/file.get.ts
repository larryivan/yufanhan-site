import { createError, getQuery, setHeaders } from 'h3'
import { imageType } from '#shared/admin'
import { requireAdmin } from '../../admin/session'

/** public/images/… or public/files/…, any depth, no dot-segments. */
const PUBLIC_FILE = /^public\/(?:images|files)\/(?:[\w-][\w.-]*\/)*[\w-][\w.-]*$/

/**
 * A post's image or attachment for the preview, straight from the repository (or
 * an upload not yet committed, by SHA): a saved draft's images are not on the
 * live site until it is published.
 */
export default defineEventHandler(async (event) => {
  const { storage } = await requireAdmin(event)
  const query = getQuery(event)
  const bySha = typeof query.sha === 'string'
  const path = bySha ? '' : String(query.path ?? '')
  if (!bySha && !PUBLIC_FILE.test(path)) throw createError({ statusCode: 400, message: 'Not a public file.' })

  const bytes = bySha ? await storage.readFile({ sha: String(query.sha) }) : await storage.readFile({ path })
  if (!bytes) throw createError({ statusCode: 404, message: 'File not found.' })

  const name = bySha ? String(query.name ?? '') : path.split('/').pop()!
  const type = imageType(name) ?? (name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
  setHeaders(event, {
    'content-type': type,
    // A SHA names these bytes for good; a path may be given new ones.
    'cache-control': bySha ? 'private, max-age=31536000, immutable' : 'private, max-age=60',
    // Served from the site's own origin: an SVG or a PDF opened from here runs no script.
    'content-security-policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    ...(type === 'application/octet-stream' ? { 'content-disposition': 'attachment' } : {})
  })
  return Buffer.from(bytes)
})
