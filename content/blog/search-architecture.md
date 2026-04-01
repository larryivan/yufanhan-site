---
title: "在 Markdown 博客上实现搜索的两种方式"
description: "前端模糊搜索 vs 服务器端 queryContent API，何时选择哪一种。"
date: 2024-10-18
section: blog
tags:
  - Search
  - Nuxt Content
  - Architecture
cover: https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80
draft: false
---

## 前端索引（fuse.js）

- 适合文章数目在百篇以内，直接在构建时生成 `public/search-index.json`。
- 优势：无额外后端，静态站即可用；缺点：索引文件过大、无法做权限控制。

## 服务端查询（本项目实现）

- 使用 `queryContent(event)` 在 Nitro server 侧过滤、分页，支持关键词/标签/年份。
- 优势：结果实时、支持更大内容体量；缺点：需要运行时服务或 Serverless。 

## 性能建议

- 关键词最少 2 个字符再触发查询，前端加 250ms 防抖。
- 若文章过千，可考虑生成轻量倒排索引并缓存热点查询。

![](./assets/hap3.png)
