<script setup lang="ts">
import { computed, isVNode, type Slots, type VNode } from 'vue'
import { useLink } from 'vue-router'

// The markup behind ProseH2-4, so the three cannot drift apart.
const props = defineProps<{ level: 2 | 3 | 4; id?: string }>()

const route = useRoute()

/*
 * A plain click on the permalink goes through the router, because vue-router
 * records no scroll position for a native fragment jump and Back would not
 * return to where the reader was. navigate() leaves modified and middle clicks
 * to the browser (new tab, new window), as a plain link does. The location is
 * only resolved on a click, so a route change does not re-render the heading
 * and walk its content again.
 */
const { navigate } = useLink({
  to: computed(() => ({ path: route.path, query: route.query, hash: `#${props.id}` }))
})

// MDC stamps the Markdown tag on the component it renders a node with, so a
// raw `<a id>` without an href counts too.
const isLink = (node: VNode) =>
  node.type === 'a' || (node.type as { tag?: string }).tag === 'a' || node.props?.href != null

/**
 * The heading text is its own permalink, unless it already holds a link: an
 * <a> inside another <a> is invalid, so the browser would split the server
 * markup apart and hydration would no longer match. Such a heading renders as
 * plain text; the TOC still reaches it by id.
 */
const hasLink = (children: unknown): boolean =>
  Array.isArray(children) &&
  children.some((child) => {
    if (Array.isArray(child)) return hasLink(child)
    if (!isVNode(child)) return false
    if (isLink(child)) return true
    // Elements keep their children in an array, components in slot functions.
    const nested = child.children
    if (Array.isArray(nested)) return hasLink(nested)
    return !!nested && typeof nested === 'object' && hasLink((nested as Slots).default?.())
  })
</script>

<template>
  <component :is="`h${level}`" :id="id" class="prose-heading">
    <a v-if="id && !hasLink($slots.default?.())" :href="`#${id}`" class="prose-heading-link" @click="navigate"><slot /></a>
    <slot v-else />
  </component>
</template>
