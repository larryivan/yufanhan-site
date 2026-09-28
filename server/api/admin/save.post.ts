import { createError, readValidatedBody } from 'h3'
import type { SaveResult } from '#shared/admin'
import { POST_SECTIONS } from '#shared/utils/sections'
import { contentProblems, isPostSlug } from '../../../content.validation'
import { forEditor, saveInput } from '../../admin/input'
import { composePost, gitBlobSha, isMediaPath, mediaDirs, parsePostPath, postPath, splitPost } from '../../admin/post-file'
import { requireAdmin } from '../../admin/session'
import type { Change, Snapshot } from '../../admin/storage/types'

const conflict = (code: string, message: string) => createError({ statusCode: 409, message, data: { code } })

const shorten = (text: string, max = 60) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

/** Another section's post with the same slug, which would share its upload folders. */
const sharedSlug = (snapshot: Snapshot, section: string, slug: string) =>
  POST_SECTIONS.find((other) => other !== section && snapshot.files.has(postPath(other, slug)))

/**
 * Saves a post, and the files uploaded for it, as one commit.
 *
 * A draft may be saved with problems; publishing needs none, since the build
 * would fail on them. A draft that stays a draft doesn't change the live site, so
 * its commit says `[skip deploy]` and Vercel skips the build (vercel.json).
 */
export default defineEventHandler(async (event): Promise<SaveResult> => {
  const { storage } = await requireAdmin(event)
  const input = await readValidatedBody(event, saveInput.parse)
  const { section, slug, meta } = input

  const { raw, bodyLine } = composePost(meta, input.body)
  const problems = forEditor(contentProblems(raw, { section, slug }), bodyLine)
  if (!isPostSlug(slug)) {
    throw createError({ statusCode: 422, message: 'The post needs a URL first.', data: { problems } })
  }
  if (!meta.draft && problems.length) {
    throw createError({ statusCode: 422, message: 'Fix the problems before publishing.', data: { problems } })
  }

  const path = postPath(section, slug)
  const source = input.source
  const from = source ? parsePostPath(source.path) : null
  if (source && !from) throw createError({ statusCode: 400, message: 'Not a post.' })

  // The version being replaced says whether the live site changes.
  const previous = source ? await storage.readPost(source.path) : null
  if (source && !previous && !input.force) {
    throw conflict('deleted', 'This post was deleted elsewhere since you opened it.')
  }
  const wasDraft = previous ? splitPost(previous.text).meta.draft : true
  const deploy = !(wasDraft && meta.draft)
  const verb = wasDraft ? (meta.draft ? 'Draft' : 'Publish') : meta.draft ? 'Unpublish' : 'Update'
  const message = `${verb}: ${shorten(meta.title.trim() || slug)}${deploy ? '' : '\n\n[skip deploy]'}`

  const { commit } = await storage.commit((snapshot) => {
    const current = source ? snapshot.files.get(source.path) : undefined
    if (source && !input.force) {
      if (!current) throw conflict('deleted', 'This post was deleted elsewhere since you opened it.')
      if (current.sha !== source.sha) throw conflict('changed', 'This post was changed elsewhere since you opened it.')
    }
    if (path !== source?.path) {
      if (snapshot.files.has(path)) throw conflict('exists', `Another post already lives at /${section}/${slug}.`)
      const other = sharedSlug(snapshot, section, slug)
      if (other && other !== from?.section) {
        throw conflict('exists', `A post in ${other} already uses the name "${slug}". Pick another URL.`)
      }
    }

    const changes: Change[] = [{ type: 'text', path, text: raw }]
    if (source && current && source.path !== path) changes.push({ type: 'delete', path: source.path })

    // A new slug takes the post's uploads along to the matching folders (the
    // editor has rewritten the links). Folders another post shares are copied.
    if (from && from.slug !== slug) {
      const keepOld = Boolean(sharedSlug(snapshot, from.section, from.slug))
      for (const dir of mediaDirs(from.slug)) {
        const target = dir.replace(`/${from.slug}/`, `/${slug}/`)
        for (const file of snapshot.files.values()) {
          if (!file.path.startsWith(dir)) continue
          changes.push({ type: 'blob', path: target + file.path.slice(dir.length), sha: file.sha })
          if (!keepOld) changes.push({ type: 'delete', path: file.path })
        }
      }
    }

    for (const upload of input.uploads) {
      if (!isMediaPath(upload.path, slug)) {
        throw createError({ statusCode: 400, message: `Uploads go in public/images/${slug}/ or public/files/${slug}/.` })
      }
      changes.push({ type: 'blob', path: upload.path, sha: upload.sha })
    }
    return { message, changes }
  })

  return { path, sha: gitBlobSha(Buffer.from(raw)), commit, deploy }
})
