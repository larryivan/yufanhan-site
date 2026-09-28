import type { PostSummary } from '#shared/admin'
import { parsePostPath, splitPost } from '../../admin/post-file'
import { requireAdmin } from '../../admin/session'

/** Every post, drafts included, newest first. */
export default defineEventHandler(async (event) => {
  const { storage } = await requireAdmin(event)
  const posts = (await storage.listPosts()).flatMap((source): PostSummary[] => {
    // A file whose name is not a valid slug fails the build: it is fixed in the repository.
    const location = parsePostPath(source.path)
    if (!location) return []
    const { meta } = splitPost(source.text)
    return [{
      path: source.path,
      ...location,
      sha: source.sha,
      title: meta.title || location.slug,
      description: meta.description,
      date: meta.date,
      draft: meta.draft,
      tags: meta.tags
    }]
  })
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
  return { posts }
})
