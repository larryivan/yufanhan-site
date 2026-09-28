<script setup lang="ts">
// The logo (scripts/brand/logo.py).
import logo from '~/assets/brand/logo.svg?raw'

/** The editor's frosted bar: the logo (or a way back), the page's own controls, then actions. */
defineProps<{ back?: string }>()

const siteName = String(useRuntimeConfig().public.siteName)
</script>

<template>
  <header class="admin-bar">
    <div class="admin-bar-inner">
      <NuxtLink v-if="back" :to="back" class="icon-btn" aria-label="All posts">
        <AppIcon name="arrow-left" :size="18" />
      </NuxtLink>
      <NuxtLink v-else to="/admin" class="admin-brand">
        <!-- A trusted, build-time asset, so v-html is safe here. -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="brand-mark" aria-hidden="true" v-html="logo" />
        <span>{{ siteName }}<span class="admin-brand-sub"> · Editor</span></span>
      </NuxtLink>
      <div class="admin-bar-middle">
        <slot />
      </div>
      <div class="admin-bar-actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
