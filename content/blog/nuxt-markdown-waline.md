---
title: "用 Nuxt + Markdown + Waline 搭建生产级博客"
description: "内容用 Markdown，评论/浏览/点赞交给 Waline，前端用 Nuxt 4 与 @nuxt/content。"
date: 2024-11-02
updatedAt: 2024-11-20
section: blog
tags:
  - Nuxt
  - Waline
  - Markdown
cover: https://images.unsplash.com/photo-1527430253228-e93688616381?auto=format&fit=crop&w=1200&q=80
draft: false
---

## 选择 Nuxt + Markdown

- **可维护**：Markdown 即内容，无需额外 CMS；Git 即发布渠道。
- **SEO 友好**：Nuxt 支持 SSR/ISR，@nuxt/content 自带 sitemap、OG 元数据。
- **可扩展**：Nitro server 可直接编写 API，与数据库或第三方服务整合。

## Waline 接入思路

1. 部署 Waline server（Vercel/自托管），配置数据库即可。
2. 前端引入 `@waline/client/component`，在详情页传入 `serverURL` 与 `path`。
3. 开启 `pageview`、`reaction`，Waline 负责浏览量与点赞，评论区默认开启防刷。

## 目录与渲染

- 将技术文章放入 `content/blog/*.md`，生活类放入 `content/life/*.md`。
- 使用 `<ContentRenderer>` 渲染正文，`toc` 字段生成右侧目录。
- `queryContent()` 支持过滤、排序与分页，可在 server route 中暴露搜索接口。

## 部署与运维

- 前端可静态托管，Waline/Nitro API 可部署为 Serverless 函数。
- 给环境变量注入 `WALINE_SERVER_URL`，并在构建时预渲染公共页面。
- 使用 `runtimeConfig.public.siteUrl` 生成完整的 OG/分享链接。
