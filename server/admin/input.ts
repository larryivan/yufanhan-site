import { z } from 'zod'
import type { PostMeta, Problem } from '#shared/admin'
import { POST_SECTIONS } from '#shared/utils/sections'
import type { Problem as FileProblem } from '../../content.validation'

/** Request bodies of the editor's routes, checked before anything reads them. */

const sha = z.string().regex(/^[0-9a-f]{40}$/)

const meta = z.object({
  title: z.string().max(300),
  description: z.string().max(1000),
  date: z.string().max(40),
  updatedAt: z.string().max(40),
  tags: z.array(z.string().max(100)).max(50),
  cover: z.string().max(2000),
  draft: z.boolean(),
  // Fields the editor has no control for, passed back as they were loaded.
  extra: z.record(z.unknown()).transform((extra) =>
    Object.fromEntries(Object.entries(extra).filter(([key]) => /^[A-Za-z_][\w-]*$/.test(key)))
  )
}) satisfies z.ZodType<PostMeta, z.ZodTypeDef, unknown>

export const postInput = z.object({
  section: z.enum(POST_SECTIONS),
  slug: z.string().max(120),
  meta,
  body: z.string().max(500_000)
})

export const saveInput = postInput.extend({
  /** The file as it was opened; absent for a new post. */
  source: z.object({ path: z.string().max(300), sha }).optional(),
  /** Files uploaded for this post, to commit with it. */
  uploads: z.array(z.object({ path: z.string().max(300), sha })).max(200).default([]),
  /** Save over a version saved elsewhere since the post was opened. */
  force: z.boolean().default(false)
})

export const deleteInput = z.object({ path: z.string().max(300), sha })

/** A problem as the editor shows it: body lines counted from the body's first line. */
export const forEditor = (problems: FileProblem[], bodyLine: number): Problem[] =>
  problems.map(({ line, field, message }) => ({
    ...(line ? { line: Math.max(1, line - bodyLine + 1) } : {}),
    ...(field ? { field } : {}),
    message
  }))
