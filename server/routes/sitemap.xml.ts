import { queryCollection } from '@nuxt/content/server'

const STATIC_PAGES = ['/', '/blog', '/life', '/about']

export default defineEventHandler(async (event) => {
  const origin = siteOrigin(event)

  const posts = await queryCollection(event, 'posts')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .select('path', 'date', 'updatedAt')
    .all()

  const url = (path: string, lastmod = '') =>
    `  <url>\n    <loc>${escapeXml(origin + (path === '/' ? '/' : path))}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}  </url>`

  const entries = [
    ...STATIC_PAGES.map(path => url(path)),
    ...posts.map(post => url(post.path, dayOf(post.updatedAt) || dayOf(post.date)))
  ]

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`
})
