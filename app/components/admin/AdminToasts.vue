<script setup lang="ts">
import { dismissToast, toasts } from '~/utils/admin/toast'
</script>

<template>
  <div class="admin-toasts" aria-live="polite">
    <TransitionGroup name="admin-toast">
      <div v-for="item in toasts" :key="item.id" class="admin-toast" :class="{ 'is-error': item.tone === 'error' }">
        <span>{{ item.text }}</span>
        <a v-if="item.link" :href="item.link.href" target="_blank" rel="noopener">{{ item.link.label }}</a>
        <button class="admin-btn is-quiet is-small" type="button" aria-label="Dismiss" @click="dismissToast(item.id)">
          <AppIcon name="x" :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
