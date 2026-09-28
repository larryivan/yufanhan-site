// A route rather than public/robots.txt: the Sitemap line must be absolute, and
// only SITE_URL knows the origin. Without a public origin the line is left out
// rather than pointing crawlers at localhost.
export default defineEventHandler((event) => {
  const origin = siteOrigin(event)
  const sitemap = isPublicOrigin(origin) ? `\nSitemap: ${origin}/sitemap.xml\n` : ''
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return `User-agent: *\nDisallow: /__nuxt_content/\nDisallow: /api/\nDisallow: /admin\n${sitemap}`
})
