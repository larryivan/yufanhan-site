<script setup lang="ts">
/**
 * Images on their way in: each is resized and uploaded in the background while
 * its description is typed. The description (alt text) is what a screen reader
 * says and what shows if the image fails, so it is required; a caption makes the
 * image a figure.
 */

export interface ImageItem {
  id: number
  fileName: string
  status: 'working' | 'ready' | 'error'
  error?: string
  /** A local URL for the thumbnail, once resized. */
  thumb?: string
  alt: string
  caption: string
}

const props = defineProps<{ open: boolean, items: ImageItem[] }>()
const emit = defineEmits<{ insert: [], cancel: [], edit: [id: number, field: 'alt' | 'caption', value: string] }>()

const valueOf = (event: Event) => (event.target as HTMLInputElement).value

const working = computed(() => props.items.some((item) => item.status === 'working'))
const usable = computed(() => props.items.filter((item) => item.status === 'ready'))
const missingAlt = computed(() => usable.value.some((item) => !item.alt.trim()))
const canInsert = computed(() => usable.value.length > 0 && !working.value && !missingAlt.value)
</script>

<template>
  <AdminDialog :open="open" :title="items.length > 1 ? `Add ${items.length} images` : 'Add image'" wide @close="emit('cancel')">
    <ul class="image-items">
      <li v-for="item in items" :key="item.id" class="image-item">
        <div class="image-thumb">
          <img v-if="item.thumb" :src="item.thumb" alt="">
          <span v-else-if="item.status === 'working'" class="admin-spinner" />
          <AdminIcon v-else name="alert" />
        </div>
        <div v-if="item.status === 'error'" class="image-fields">
          <strong>{{ item.fileName }}</strong>
          <p class="admin-note">{{ item.error }}</p>
        </div>
        <div v-else class="image-fields">
          <label>
            <span>Description <em>required</em></span>
            <input :value="item.alt" type="text" placeholder="What the image shows" maxlength="300" @input="emit('edit', item.id, 'alt', valueOf($event))">
          </label>
          <label>
            <span>Caption <em>optional</em></span>
            <input :value="item.caption" type="text" placeholder="Shown under the image" maxlength="400" @input="emit('edit', item.id, 'caption', valueOf($event))">
          </label>
          <p v-if="item.status === 'working'" class="image-status">Resizing and uploading…</p>
        </div>
      </li>
    </ul>
    <template #actions>
      <button class="admin-btn is-quiet" type="button" @click="emit('cancel')">Cancel</button>
      <button class="admin-btn is-primary" type="button" :disabled="!canInsert" @click="emit('insert')">
        <span v-if="working" class="admin-spinner" />
        Insert
      </button>
    </template>
  </AdminDialog>
</template>
