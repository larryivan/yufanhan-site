const env =
  (globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>
    }
  }).process?.env || {}

export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-12-05',
  experimental: {
    viewTransition: true
  },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css', '@waline/client/style'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      script: [
        {
          innerHTML: "document.documentElement.classList.add('has-js')",
          tagPosition: 'head'
        }
      ],
      titleTemplate: '%s · LiH Blog',
      title: 'LiH Blog',
      meta: [
        {
          name: 'description',
          content: 'A Nuxt-powered Markdown blog with Home, Blog, Life and About sections.'
        },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com'
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous'
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap'
        }
      ]
    }
  },
  runtimeConfig: {
    public: {
      siteName: 'LiH Blog',
      siteUrl: env.SITE_URL || 'http://localhost:3000',
      walineServerURL: env.WALINE_SERVER_URL || '',
      walineLang: env.WALINE_LANG || 'en'
    }
  },
  content: {
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark'
      }
    },
    markdown: {
      toc: { depth: 3 }
    }
  }
})
