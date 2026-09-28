<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

const props = defineProps<{
  page: number
  totalPages: number
  /** Pages are links rather than buttons, so every archive page has its own URL. */
  pageLink: (page: number) => RouteLocationRaw
}>()

/**
 * Every page when there are few; otherwise the first, the last and the current
 * neighbourhood, always in seven slots so the bar keeps its width while paging.
 */
const items = computed<(number | 'gap')[]>(() => {
  const { page, totalPages: last } = props
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'gap', last]
  if (page >= last - 3) return [1, 'gap', last - 4, last - 3, last - 2, last - 1, last]
  return [1, 'gap', page - 1, page, page + 1, 'gap', last]
})
</script>

<template>
  <nav class="pagination" aria-label="Pagination">
    <!-- RouterLink ignores the query when it decides a link is the current page,
         so it would mark every link here aria-current="page": each link sets the
         attribute itself. -->
    <NuxtLink
      v-if="page > 1"
      :to="pageLink(page - 1)"
      class="pagination-step"
      rel="prev"
      :aria-current="undefined"
    >
      <AppIcon name="chevron-left" />
      Previous
    </NuxtLink>
    <span v-else class="pagination-step is-disabled" aria-hidden="true">
      <AppIcon name="chevron-left" />
      Previous
    </span>

    <ol class="pagination-pages">
      <li
        v-for="(item, index) in items"
        :key="item === 'gap' ? `gap-${index}` : item"
        :aria-hidden="item === 'gap' ? 'true' : undefined"
      >
        <span v-if="item === 'gap'" class="pagination-gap">…</span>
        <NuxtLink
          v-else
          :to="pageLink(item)"
          class="pagination-page"
          :aria-label="`Page ${item}`"
          :aria-current="item === page ? 'page' : undefined"
        >
          {{ item }}
        </NuxtLink>
      </li>
    </ol>

    <NuxtLink
      v-if="page < totalPages"
      :to="pageLink(page + 1)"
      class="pagination-step"
      rel="next"
      :aria-current="undefined"
    >
      Next
      <AppIcon name="chevron-right" />
    </NuxtLink>
    <span v-else class="pagination-step is-disabled" aria-hidden="true">
      Next
      <AppIcon name="chevron-right" />
    </span>
  </nav>
</template>

<style scoped>
/* Every page slot, the gap included, is the same width, so the bar keeps its
   width and Next stays put while paging. Slots shrink only on the narrowest
   phones, where seven full ones no longer fit. */
.pagination {
  --pagination-slot: 36px;
  display: flex;
  align-items: center;
  gap: 12px 16px;
}

.pagination-pages {
  display: flex;
  gap: 6px;
  min-width: 0;
  list-style: none;
}

.pagination-pages li {
  display: flex;
  width: var(--pagination-slot);
  min-width: 0;
}

.pagination-step,
.pagination-page,
.pagination-gap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
}

/* The archive's tag chip (PostArchive's `.tag-pill`), so the filters above the
   list and the pages below it read as one control. */
.pagination-step,
.pagination-page {
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: linear-gradient(180deg, var(--surface-highlight), transparent 70%), var(--glass-card);
  box-shadow:
    inset 0 1px 0 var(--surface-highlight),
    inset 0 -3px 6px -4px var(--line-strong);
  color: var(--muted);
  font-size: var(--text-sm);
  font-weight: 500;
  transition:
    color var(--dur-fast) var(--ease-standard),
    background-color var(--dur-fast) var(--ease-standard),
    box-shadow var(--dur-base) var(--ease-standard);
}

.pagination-step {
  flex: none;
  gap: 8px;
  padding: 0 14px;
}

.pagination-page,
.pagination-gap {
  width: 100%;
}

.pagination-page {
  font-family: var(--font-mono);
}

.pagination-gap {
  color: var(--muted);
}

@media (hover: hover) {
  a.pagination-step:hover,
  .pagination-page:hover {
    color: var(--heading);
    background: var(--glass-strong);
    box-shadow:
      inset 0 1px 0 var(--surface-highlight),
      0 0 0 1px var(--line),
      0 8px 20px -12px var(--surface-glow-strong);
  }
}

.pagination-page[aria-current='page'] {
  color: var(--on-accent);
  background: var(--accent);
  border-color: var(--accent);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 8px 22px -10px var(--surface-glow-strong);
}

/* Kept in place (and hidden from assistive tech) so the page numbers do not
   shift when the first or last page is reached. */
.pagination-step.is-disabled {
  opacity: 0.45;
}

@media (pointer: coarse) {
  .pagination {
    --pagination-slot: 44px;
  }

  .pagination-step,
  .pagination-page,
  .pagination-gap {
    min-height: 44px;
  }
}

/* One row does not fit a phone. Previous and Next share the first and the
   pages take the whole second, instead of wrapping into ragged rows around
   them. Only the visual order changes: reading and Tab order stay Previous,
   pages, Next. */
@media (max-width: 640px) {
  .pagination {
    flex-wrap: wrap;
  }

  .pagination-pages {
    order: 1;
    flex-basis: 100%;
  }
}

/* Forced colours replace the fill that marks the current page. Opting out of
   forcing also keeps the author focus ring, in an accent picked for the site
   theme rather than the system one, so it takes the system text colour. */
@media (forced-colors: active) {
  .pagination-page[aria-current='page'] {
    forced-color-adjust: none;
    color: HighlightText;
    background: Highlight;
    border-color: Highlight;
  }

  .pagination-page[aria-current='page']:focus-visible {
    outline-color: CanvasText;
  }
}
</style>
