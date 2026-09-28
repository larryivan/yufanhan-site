import { createError, getRequestHeader, readRawBody } from 'h3'
import { MAX_UPLOAD_BYTES } from '#shared/admin'
import { requireAdmin } from '../../admin/session'

const tooLarge = () =>
  createError({ statusCode: 413, message: `Files can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` })

/**
 * Stores one file's bytes (the request body, as is) until a save commits it with
 * its post. The editor has already resized and re-encoded images.
 */
export default defineEventHandler(async (event) => {
  const { storage } = await requireAdmin(event)
  if (Number(getRequestHeader(event, 'content-length') || 0) > MAX_UPLOAD_BYTES) throw tooLarge()
  const bytes = await readRawBody(event, false)
  if (!bytes?.byteLength) throw createError({ statusCode: 400, message: 'The file is empty.' })
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw tooLarge()
  return { sha: await storage.putBlob(new Uint8Array(bytes)), size: bytes.byteLength }
})
