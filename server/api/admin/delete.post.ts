import { createError, readValidatedBody } from 'h3'
import { POST_SECTIONS } from '#shared/utils/sections'
import { deleteInput } from '../../admin/input'
import { mediaDirs, parsePostPath, postPath, splitPost } from '../../admin/post-file'
import { requireAdmin } from '../../admin/session'

/**
 * Deletes a post and its upload folders in one commit. Git keeps the history, so
 * a deleted post can still be recovered from the repository.
 */
export default defineEventHandler(async (event) => {
  const { storage } = await requireAdmin(event)
  const input = await readValidatedBody(event, deleteInput.parse)
  const location = parsePostPath(input.path)
  if (!location) throw createError({ statusCode: 400, message: 'Not a post.' })

  const previous = await storage.readPost(input.path)
  if (!previous) throw createError({ statusCode: 404, message: 'This post is already gone.' })
  const { meta } = splitPost(previous.text)
  const deploy = !meta.draft
  const message = `Delete: ${meta.title.trim() || location.slug}${deploy ? '' : '\n\n[skip deploy]'}`

  const { commit } = await storage.commit((snapshot) => {
    const current = snapshot.files.get(input.path)
    if (!current) throw createError({ statusCode: 404, message: 'This post is already gone.' })
    if (current.sha !== input.sha) {
      throw createError({
        statusCode: 409,
        message: 'This post was changed elsewhere since you opened it. Reload it first.',
        data: { code: 'changed' }
      })
    }
    // Another section's post with the same slug shares the folders: they stay.
    const shared = POST_SECTIONS.some(
      (section) => section !== location.section && snapshot.files.has(postPath(section, location.slug))
    )
    const dirs = shared ? [] : mediaDirs(location.slug)
    const media = [...snapshot.files.keys()].filter((path) => dirs.some((dir) => path.startsWith(dir)))
    return { message, changes: [input.path, ...media].map((path) => ({ type: 'delete' as const, path })) }
  })

  return { commit, deploy }
})
