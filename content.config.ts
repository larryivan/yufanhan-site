import { join } from 'node:path'
import { defineContentConfig, defineCollection } from '@nuxt/content'
import { POST_SECTIONS, ignoredGlobs, pageSchema, postSchema, readContentFiles } from './content.schema'

/**
 * Drafts are left out of production builds altogether. Every query filters them,
 * but each collection also ships as a public SQL dump
 * (/__nuxt_content/posts/sql_dump.txt) that would still carry a draft's full
 * text. Dev keeps them, so flipping `draft` needs no restart. Post file names are
 * validated slugs, so these paths are safe to use as globs.
 */
const drafts =
  process.env.NODE_ENV === 'production'
    ? readContentFiles(join(import.meta.dirname, 'content')).filter(
        (entry) => entry.collection === 'posts' && entry.frontmatter.draft === true
      )
    : []

export default defineContentConfig({
  collections: {
    /**
     * Posts live in two directories but share one shape, so they share one
     * collection: the home page, search and tag aggregation each stay a single
     * query, and `section` (taken from the directory) is what separates them.
     */
    posts: defineCollection({
      type: 'page',
      // One level deep only: a post's route is /<section>/<slug>, so a file in a
      // subdirectory would have no page.
      source: POST_SECTIONS.map((section) => ({
        include: `${section}/*.md`,
        prefix: `/${section}`,
        exclude: [
          ...ignoredGlobs(section),
          ...drafts.filter((entry) => entry.section === section).map((entry) => entry.file)
        ]
      })),
      schema: postSchema,
      // The archive filters by section and orders by date on every request.
      indexes: [{ columns: ['section', 'date'] }, { columns: ['draft'] }]
    }),

    pages: defineCollection({
      type: 'page',
      source: { include: '*.md', exclude: ignoredGlobs() },
      schema: pageSchema
    })
  }
})
