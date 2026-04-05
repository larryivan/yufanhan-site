---
title: "Two Ways to Add Search to a Markdown Blog"
description: "Frontend fuzzy search versus a server-side queryContent API, and when each one makes sense."
date: 2024-10-18
section: blog
tags:
  - Search
  - Nuxt Content
  - Architecture
cover: https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80
draft: false
---

## Frontend indexing with fuse.js

- A good fit for sites with a modest amount of content, where `public/search-index.json` can be generated at build time.
- The upside is zero backend complexity; the tradeoff is a larger index file and fewer control points.

## Server-side querying in this project

- Use `queryContent(event)` inside Nitro routes to filter and paginate by keyword, tag, or year.
- This scales better and keeps results fresh, but it does require runtime infrastructure or serverless execution.

## Performance notes

- Wait until the query has at least two characters before sending a request.
- Add a debounce around 250ms to keep the UI responsive.
- If the archive grows large, a lightweight inverted index plus cached hot queries is a reasonable next step.

![](/images/hap3.png)
