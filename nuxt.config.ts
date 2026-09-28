import { join } from 'node:path'
import { readContentFiles } from './content.schema'
import { CODE_LANGS, CODE_THEMES, KATEX_MACROS, KATEX_OPTIONS, MARKDOWN_TOC } from './markdown.config'

const env = process.env

const SITE_NAME = 'Yufan Han'

// The public origin. On Vercel it defaults to the project's production domain
// (its custom domain once there is one, else the vercel.app one), so a
// deployment needs no SITE_URL of its own.
const SITE_URL = (
  env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/+$/, '')
const SITE_DESCRIPTION = 'Notes on code, genomes, and everyday life.'

/**
 * Article routes to prerender. The archive pages are not prerendered (see
 * routeRules), so the crawler would only find the handful of posts the home page
 * links to. Reads content/ with the same rules as content.config.ts (ignored
 * names, one level, drafts excluded — a draft 404s in production).
 */
const postRoutes = () =>
  readContentFiles(join(import.meta.dirname, 'content'))
    .filter(entry => entry.collection === 'posts' && entry.frontmatter.draft !== true)
    .map(entry => `/${entry.file.replace(/\.md$/, '')}`)

// Runs before first paint. Storage is read in its own try: when site data is
// blocked, getItem throws, and the whole block used to be skipped — a dark-OS
// visitor then got a light first paint until hydration.
const THEME_BOOT = [
  "var d=document.documentElement;d.classList.add('has-js','is-first-load');var t=null;",
  "try{t=localStorage.getItem('theme')}catch(e){}",
  "if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}",
  "d.dataset.theme=t;d.classList.toggle('dark',t==='dark')"
].join('')

const securityHeaders = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN'
}

// Unhashed public files: fresh for a day, then revalidated in the background, so a
// replaced image still shows up within a day.
const publicFileCache = { headers: { 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800' } }
// Requested only with the build id (`?_b=`) or content checksum (`?v=`) in the query,
// so a new build or new content is a new URL.
const versionedCache = { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }

export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-12-05',
  experimental: {
    viewTransition: true
  },
  modules: ['@nuxt/content', '@nuxt/eslint'],
  vite: {
    build: {
      // Vite 8 defaults to "baseline widely available" (Safari 16.4+), so lightningcss
      // rewrote every media query in range syntax, `(width<=640px)`, which Safari/iOS
      // before 16.4 ignore — losing the whole responsive layout there.
      cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari15', 'ios15']
    }
  },
  // Fonts are self-hosted: the Google Fonts stylesheet was render-blocking and sent
  // every visitor's IP to a third party. Each @fontsource file splits by
  // unicode-range, so only the Latin subsets are ever downloaded. Fraunces sets
  // the titles, IBM Plex Sans the text (its italic gives emphasis a real italic
  // instead of a slanted roman), JetBrains Mono code and dates. Like any face,
  // each is fetched only on a page that uses it.
  css: [
    '@fontsource-variable/fraunces/opsz.css',
    '@fontsource-variable/fraunces/opsz-italic.css',
    '@fontsource-variable/ibm-plex-sans/wght.css',
    '@fontsource-variable/ibm-plex-sans/wght-italic.css',
    '@fontsource-variable/jetbrains-mono/wght.css',
    '~/assets/css/main.css'
  ],
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      script: [
        {
          innerHTML: THEME_BOOT,
          tagPosition: 'head'
        }
      ],
      // The title template is a function and lives in app.vue: the home page must
      // not render as "Yufan Han · Yufan Han".
      title: SITE_NAME,
      meta: [
        { name: 'description', content: SITE_DESCRIPTION },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#faf8f4', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#121016', media: '(prefers-color-scheme: dark)' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'alternate', type: 'application/rss+xml', title: SITE_NAME, href: '/feed.xml' }
      ]
    }
  },
  runtimeConfig: {
    // The editor at /admin (server/admin). Server-only, and read at run time: set
    // them as NUXT_ADMIN_* environment variables (NUXT_ADMIN_GITHUB_CLIENT_ID, …),
    // no rebuild needed. On Vercel the repository, branch and deployed commit come
    // from its own variables.
    admin: {
      githubClientId: '',
      githubClientSecret: '',
      // At least 32 characters, e.g. `openssl rand -base64 32`.
      sessionPassword: '',
      repo: env.VERCEL_GIT_REPO_OWNER && env.VERCEL_GIT_REPO_SLUG ? `${env.VERCEL_GIT_REPO_OWNER}/${env.VERCEL_GIT_REPO_SLUG}` : '',
      branch: env.VERCEL_GIT_COMMIT_REF || 'main',
      // The GitHub account allowed to sign in; the repository's owner when empty.
      login: '',
      deployedCommit: env.VERCEL_GIT_COMMIT_SHA || '',
      // `npm run dev` saves to the local files unless this is 'github'.
      storage: '',
      // Dev only: a stand-in for GitHub in tests.
      githubApi: '',
      githubWeb: ''
    },
    // Every public value here is read from the environment AT BUILD TIME: articles
    // are prerendered, and a prerendered page carries the config it was built with.
    public: {
      siteName: SITE_NAME,
      siteDescription: SITE_DESCRIPTION,
      siteUrl: SITE_URL || 'http://localhost:3000',
      // Comments (giscus), kept in this repository's GitHub Discussions under
      // Announcements. The ids are public (giscus.app shows them to anyone);
      // GISCUS_* variables override them, e.g. in a fork. The comments section
      // renders only when the repo and both ids are set.
      giscus: {
        repo: env.GISCUS_REPO || 'larryivan/yufanhan-site',
        repoId: env.GISCUS_REPO_ID || 'R_kgDOUxKGog',
        category: env.GISCUS_CATEGORY || 'Announcements',
        categoryId: env.GISCUS_CATEGORY_ID || 'DIC_kwDOUxKGos4DGm3B'
      }
    }
  },
  routeRules: {
    // Revalidate HTML, the feed and the API on every visit so a redeploy is picked up
    // immediately. Hashed build assets stay immutable.
    '/**': { headers: { ...securityHeaders, 'cache-control': 'no-cache' } },
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // Requested on every page view; revalidating each one cost a round trip.
    '/images/**': publicFileCache,
    '/favicon.ico': publicFileCache,
    '/favicon.svg': publicFileCache,
    '/apple-touch-icon.png': publicFileCache,
    // The comments theme and its fonts. The giscus iframe (giscus.app) loads them
    // cross-origin with crossorigin="anonymous", which needs the CORS header.
    '/giscus/**': {
      headers: { ...publicFileCache.headers, 'access-control-allow-origin': '*' }
    },
    '/_payload.json': versionedCache,
    '/*/_payload.json': versionedCache,
    '/blog/*/_payload.json': versionedCache,
    '/life/*/_payload.json': versionedCache,
    '/__nuxt_content/*/sql_dump.txt': versionedCache,
    // The .br/.gz copies are otherwise typed by extension alone (bare application/xml),
    // so the Content-Type would depend on Accept-Encoding.
    '/feed.xml': { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } },
    '/sitemap.xml': { headers: { 'content-type': 'application/xml; charset=utf-8' } },
    // Archive output depends on ?tag= and ?page=. A prerendered copy would be served
    // unfiltered for every query string and hydrate into mismatched cards.
    '/blog': { prerender: false },
    '/life': { prerender: false },
    // The editor: a client-rendered app for one person, kept out of search engines
    // and caches.
    '/admin': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } },
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } },
    '/api/admin/**': { headers: { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' } }
  },
  nitro: {
    // Precompressed .br/.gz copies of every public asset; the node server picks the
    // right one from Accept-Encoding. Pages rendered per request are compressed by
    // server/plugins/compression.ts.
    compressPublicAssets: true,
    prerender: {
      crawlLinks: true,
      routes: ['/', '/about', '/robots.txt', '/feed.xml', '/sitemap.xml'],
      // The search endpoint and the archives must stay dynamic.
      ignore: ['/api', '/blog?', '/life?']
    }
  },
  hooks: {
    'prerender:routes'(ctx) {
      for (const route of postRoutes()) ctx.routes.add(route)
    },
    ready(nuxt) {
      // Only for real production builds — not `nuxt prepare` (postinstall) or typecheck.
      if (!nuxt.options.dev && !nuxt.options._prepare && !SITE_URL) {
        console.warn(
          '[config] SITE_URL is not set. This build omits canonical links, og:url, absolute og:image tags and the robots.txt Sitemap line, and feed.xml / sitemap.xml point at http://localhost:3000. Set SITE_URL to the public https origin before building for production.'
        )
      }
    }
  },
  content: {
    // Node's built-in SQLite, not better-sqlite3. A native addon only loads on the
    // Node version it was installed for, and Nitro runs a Vercel function on Node
    // 22 at most whatever Node built it, so on a newer build image every query
    // (the archives, search) failed with a 500.
    experimental: { sqliteConnector: 'native' },
    // v3 moved parser options under `build`; collections live in content.config.ts.
    // Content is parsed at build time, so none of these plugins reach the browser;
    // only KaTeX's stylesheet does, imported by PostArticle.
    build: {
      markdown: {
        toc: MARKDOWN_TOC,
        // $inline$ and $$display$$ formulas, rendered to HTML (plus MathML for
        // screen readers) once, at build time.
        remarkPlugins: { 'remark-math': {} },
        rehypePlugins: { 'rehype-katex': { options: { ...KATEX_OPTIONS, macros: { ...KATEX_MACROS } } } },
        highlight: {
          theme: CODE_THEMES,
          langs: CODE_LANGS
        }
      }
    }
  }
})
