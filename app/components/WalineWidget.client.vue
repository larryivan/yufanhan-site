<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps<{ path?: string }>()
const runtime = useRuntimeConfig()
const route = useRoute()

const targetPath = computed(() => props.path || route.path)
const serverURL = computed(() => runtime.public.walineServerURL)

const WalineComponent = defineAsyncComponent(async () => {
  const mod = await import('@waline/client/component')
  return mod.Waline
})
</script>

<template>
  <div>
    <div v-if="!serverURL" class="surface-card comment-status">
      Set `WALINE_SERVER_URL` to enable comments.
    </div>
    <ClientOnly v-else>
      <Suspense>
        <WalineComponent
          :serverURL="serverURL"
          :path="targetPath"
          :lang="runtime.public.walineLang"
          :pageview="true"
          :comment="true"
          :reaction="true"
          login="enable"
          dark="auto"
        />
        <template #fallback>
          <div class="surface-card comment-status">Loading comments...</div>
        </template>
      </Suspense>
    </ClientOnly>
  </div>
</template>
