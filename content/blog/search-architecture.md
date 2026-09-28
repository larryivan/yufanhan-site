---
title: "Two Ways to Add Search to a Markdown Blog"
description: "Frontend fuzzy search versus a server-side queryCollection API, and when each one makes sense."
date: 2024-10-18
updatedAt: 2026-09-25
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

- Use `queryCollection(event, 'posts')` inside a Nitro route: the draft, section and year filters run in SQL, then keyword and tag matching and paging run over the returned card rows.
- This scales better and keeps results fresh, but it does require runtime infrastructure or serverless execution.

## Performance notes

- Wait until the query has at least two characters before sending a request.
- Add a debounce around 250ms to keep the UI responsive.
- If the archive grows large, a lightweight inverted index plus cached hot queries is a reasonable next step.

![Agarose gel with three sample lanes beside a DNA ladder labelled 100 to 2000 bp](/images/hap3.webp){width="1150" height="1320"}
