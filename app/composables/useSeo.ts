import type { MaybeRefOrGetter } from 'vue'

export interface SeoOptions {
  title?: string
  description?: string
  /** Canonical route path. Defaults to the current path, without query or hash. */
  path?: string
  /** Absolute URL, or a site-relative path that is resolved against SITE_URL. */
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
  noindex?: boolean
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/

/**
 * One place for title, description, canonical, Open Graph and Twitter tags.
 *
 * Absolute URLs come from runtimeConfig.public.siteUrl (SITE_URL at build time).
 * A production build without it would publish localhost URLs, so canonical,
 * og:url and relative og:image are omitted instead.
 */
export const useSeo = (options: MaybeRefOrGetter<SeoOptions>) => {
  const config = useRuntimeConfig().public
  const route = useRoute()

  const siteUrl = String(config.siteUrl || '').replace(/\/+$/, '')
  const siteName = String(config.siteName || '')
  const canResolve = import.meta.dev || (!!siteUrl && !LOCAL_ORIGIN.test(siteUrl))

  const absolute = (value?: string) => {
    if (!value) return undefined
    if (/^https?:\/\//.test(value)) return value
    // Protocol-relative (//cdn.host/x.jpg): prefixing the site origin would give
    // https://site//cdn.host/x.jpg.
    if (value.startsWith('//')) return `https:${value}`
    if (!canResolve) return undefined
    return `${siteUrl}${value.startsWith('/') ? '' : '/'}${value}`
  }

  const input = computed(() => toValue(options))
  const canonicalPath = computed(() => {
    const path = input.value.path ?? route.path
    return path.length > 1 ? path.replace(/\/+$/, '') : path
  })
  const url = computed(() => absolute(canonicalPath.value))
  const isArticle = computed(() => input.value.type === 'article')

  useHead(() => ({
    link: url.value ? [{ rel: 'canonical', href: url.value }] : []
  }))

  useSeoMeta({
    title: () => input.value.title,
    description: () => input.value.description,
    ogTitle: () => input.value.title || siteName,
    ogDescription: () => input.value.description,
    ogType: () => input.value.type ?? 'website',
    ogUrl: () => url.value,
    ogSiteName: siteName,
    ogImage: () => absolute(input.value.image),
    twitterCard: () => (input.value.image ? 'summary_large_image' : 'summary'),
    articlePublishedTime: () => (isArticle.value ? input.value.publishedTime : undefined),
    articleModifiedTime: () => (isArticle.value ? input.value.modifiedTime : undefined),
    articleTag: () => (isArticle.value ? input.value.tags : undefined),
    robots: () => (input.value.noindex ? 'noindex, follow' : undefined)
  })
}
