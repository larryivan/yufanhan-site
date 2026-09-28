/**
 * The post sections: one directory under content/ and one archive route each.
 * Shared by the app, the server routes and the content config, which used to
 * each keep their own copy of this list.
 */
export const POST_SECTIONS = ['blog', 'life'] as const

export type PostSection = (typeof POST_SECTIONS)[number]

export const isPostSection = (value: unknown): value is PostSection =>
  typeof value === 'string' && (POST_SECTIONS as readonly string[]).includes(value)

export const SECTION_META: Record<PostSection, { label: string, path: string }> = {
  blog: { label: 'Blog', path: '/blog' },
  life: { label: 'Life', path: '/life' }
}

/** The fields a post card renders. List queries select only these, never the body. */
export const POST_CARD_FIELDS = ['path', 'title', 'description', 'date', 'section', 'cover', 'tags'] as const
