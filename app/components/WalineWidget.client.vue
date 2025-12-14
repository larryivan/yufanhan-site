<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'

const props = defineProps<{ path?: string }>()
const runtime = useRuntimeConfig()
const route = useRoute()

const targetPath = computed(() => props.path || route.path)
const serverURL = computed(() => runtime.public.walineServerURL)

const WalineComponent = defineAsyncComponent(async () => {
  const mod = await import('@waline/client/component')
  return mod.Waline || mod.default
})
</script>

<template>
  <div>
    <div v-if="!serverURL" class="card" style="margin: 16px 0;">
      请在环境变量 WALINE_SERVER_URL 中配置 Waline 服务地址。
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
          <div class="card" style="margin: 16px 0;">加载评论中...</div>
        </template>
      </Suspense>
    </ClientOnly>
  </div>
</template>
