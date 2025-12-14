export default defineNuxtConfig({
  devtools: { enabled: false },
  compatibilityDate: '2024-12-05',
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css', '@waline/client/style'],
  app: {
    head: {
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
          href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap'
        }
      ]
    }
  },
  runtimeConfig: {
    public: {
      siteName: 'LiH Blog',
      siteUrl: process.env.SITE_URL || 'http://localhost:3000',
      walineServerURL: process.env.WALINE_SERVER_URL || '',
      walineLang: process.env.WALINE_LANG || 'zh-CN'
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
