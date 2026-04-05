---
title: "Building a Production Blog with Nuxt, Markdown, and Waline"
description: "Markdown for content, Waline for engagement, and Nuxt 4 with @nuxt/content on the frontend."
date: 2024-11-02
updatedAt: 2024-11-20
section: blog
tags:
  - Nuxt
  - Waline
  - Markdown
cover: /images/local-sample.svg
draft: false
---

## Why Nuxt plus Markdown

- **Maintainable**: Markdown keeps the content close to the codebase, without introducing a separate CMS.
- **SEO-friendly**: Nuxt supports SSR and ISR, while `@nuxt/content` handles metadata cleanly.
- **Extensible**: Nitro lets you add APIs and connect to databases or external services when needed.

## Waline integration

1. Deploy a Waline server on Vercel or your own infrastructure.
2. Use `@waline/client/component` on the frontend and pass `serverURL` with the current `path`.
3. Enable pageviews and reactions so Waline can manage engagement signals for each article.

## Rendering and structure

- Store technical writing in `content/blog/*.md` and personal writing in `content/life/*.md`.
- Render posts with `<ContentRenderer>` and generate the sidebar table of contents from `toc`.
- Use `queryContent()` for filtering, sorting, and pagination, or expose search through a server route.

## Deployment

- Host the frontend statically if needed, while running Waline or Nitro APIs as serverless functions.
- Inject `WALINE_SERVER_URL` through environment variables and prerender public pages during the build.
- Use `runtimeConfig.public.siteUrl` to generate absolute Open Graph and share links.

## Local images and attachments

The cover already uses `/images/local-sample.svg` from `public/images`. You can reference local assets directly in Markdown:

![Local image example](/images/post-inline.svg)

You can also use native `<img>` tags when you need explicit sizing:

```html
<img src="/images/local-sample.svg" alt="Cover preview" width="420" />
```

Attachment example from `public/files/sample-notes.txt`:

- [Sample TXT attachment](/files/sample-notes.txt)
