import { readValidatedBody } from 'h3'
import type { PreviewResult } from '#shared/admin'
import { contentProblems, isPostSlug } from '../../../content.validation'
import { forEditor, postInput } from '../../admin/input'
import { composePost } from '../../admin/post-file'
import { renderPost } from '../../admin/render'
import { requireAdmin } from '../../admin/session'

/**
 * The editor's live preview: the post rendered exactly as the build would render
 * it, and everything that would stop it from being published.
 */
export default defineEventHandler(async (event): Promise<PreviewResult> => {
  await requireAdmin(event)
  const { section, slug, meta, body } = await readValidatedBody(event, postInput.parse)
  const { raw, bodyLine } = composePost(meta, body)
  // A new post may have no slug yet; it still renders.
  const post = await renderPost(raw, { section, slug: isPostSlug(slug) ? slug : 'untitled' })
  return { post, problems: forEditor(contentProblems(raw, { section, slug }), bodyLine) }
})
