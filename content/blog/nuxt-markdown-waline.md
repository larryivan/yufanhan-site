---
title: "Building a Production Blog with Nuxt, Markdown, and Waline"
description: "Markdown for content, Waline for engagement, and Nuxt 4 with @nuxt/content on the frontend."
date: 2024-11-02
updatedAt: 2026-09-25
tags:
  - Nuxt
  - Waline
  - Markdown
cover: https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80
draft: false
---

## Why Nuxt plus Markdown

- **Maintainable**: Markdown keeps the content close to the codebase, without introducing a separate CMS.
- **SEO-friendly**: Nuxt supports SSR and ISR, while `@nuxt/content` handles metadata cleanly.
- **Extensible**: Nitro lets you add APIs and connect to databases or external services when needed.

## Waline integration

1. Deploy a Waline server on Vercel or your own infrastructure.
2. Use `@waline/client/component` on the frontend and pass `serverURL` with the current `path`.
3. Turn on `reaction` for per-article reactions. Page views are counted separately: `pageviewCount({ serverURL, path })` from `@waline/client` records the visit and writes the total into each `.waline-pageview-count` element.

## Rendering and structure

- Store technical writing in `content/blog/*.md` and personal writing in `content/life/*.md`. Both feed one `posts` collection, and the directory decides the section.
- Render posts with `<ContentRenderer>` and generate the sidebar table of contents from `toc`.
- Use `queryCollection('posts')` for filtering, sorting, and pagination, or expose search through a server route.

## Deployment

- Articles are prerendered during the build. The archives and the search API are rendered on request by the Nitro server, and Waline runs as its own service.
- Set `WALINE_SERVER_URL` in the environment before building: a prerendered page keeps the value it was built with.
- Set `SITE_URL` as well. It becomes `runtimeConfig.public.siteUrl`, which turns canonical links, `og:url`, and `og:image` into absolute URLs.

## Local images and attachments

Files in `public/` are served from the site root, so an image in `public/images` can be referenced directly in Markdown:

![Sample card that reads "Inline image in Markdown"](/images/post-inline.svg){width="900" height="480"}

You can also use native `<img>` tags when you need explicit sizing:

```html
<img src="/images/local-sample.svg" alt="Sample cover" width="420" />
```

Attachment example from `public/files/sample-notes.txt`:

- [Sample TXT attachment](/files/sample-notes.txt)
