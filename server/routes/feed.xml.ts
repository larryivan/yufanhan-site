import { queryCollection } from '@nuxt/content/server'

const FEED_SIZE = 30

export default defineEventHandler(async (event) => {
  const origin = siteOrigin(event)
  const { siteName, siteDescription } = useRuntimeConfig(event).public

  const posts = await queryCollection(event, 'posts')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .limit(FEED_SIZE)
    .select('path', 'title', 'description', 'date', 'tags')
    .all()

  const items = posts
    .map((post) => {
      const link = `${origin}${post.path}`
      const day = dayOf(post.date)
      const pubDate = day ? new Date(`${day}T00:00:00Z`).toUTCString() : ''
      const categories = (post.tags || []).map(tag => `      <category>${escapeXml(tag)}</category>`).join('\n')
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        pubDate ? `      <pubDate>${pubDate}</pubDate>` : '',
        `      <description>${escapeXml(post.description)}</description>`,
        categories
      ].filter(Boolean).join('\n') + '\n    </item>'
    })
    .join('\n')

  const lastBuild = posts[0] ? dayOf(posts[0].date) : ''

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(String(siteName))}</title>
    <link>${escapeXml(origin)}/</link>
    <description>${escapeXml(String(siteDescription))}</description>
    <language>en</language>
    <atom:link href="${escapeXml(origin)}/feed.xml" rel="self" type="application/rss+xml" />
${lastBuild ? `    <lastBuildDate>${new Date(`${lastBuild}T00:00:00Z`).toUTCString()}</lastBuildDate>\n` : ''}${items}
  </channel>
</rss>
`
})
