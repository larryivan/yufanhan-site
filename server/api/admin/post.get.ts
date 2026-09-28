import { createError, getQuery } from 'h3'
import type { EditorPost } from '#shared/admin'
import { contentProblems } from '../../../content.validation'
import { forEditor } from '../../admin/input'
import { parsePostPath, splitPost } from '../../admin/post-file'
import { requireAdmin } from '../../admin/session'

/** One post, split into the editor's fields. */
export default defineEventHandler(async (event): Promise<EditorPost> => {
  const { storage } = await requireAdmin(event)
  const path = String(getQuery(event).path ?? '')
  const location = parsePostPath(path)
  if (!location) throw createError({ statusCode: 400, message: 'Not a post.' })

  const source = await storage.readPost(path)
  if (!source) throw createError({ statusCode: 404, message: 'This post no longer exists.' })

  const { meta, body, bodyLine, frontmatterErrors } = splitPost(source.text)
  // Opening it would show empty fields, and saving would write them over the real ones.
  if (frontmatterErrors.length) {
    throw createError({
      statusCode: 422,
      message: `The frontmatter of ${path} can't be read (${frontmatterErrors[0]}). Fix it in the repository first.`
    })
  }
  return {
    path,
    ...location,
    sha: source.sha,
    title: meta.title,
    description: meta.description,
    date: meta.date,
    draft: meta.draft,
    tags: meta.tags,
    meta,
    body,
    problems: forEditor(contentProblems(source.text, location), bodyLine)
  }
})
