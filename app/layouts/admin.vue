<script setup lang="ts">
import '~/assets/css/admin.css'
import { signInUrl, signedOut } from '~/utils/admin/api'

useHead({
  title: 'Editor',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

const route = useRoute()
</script>

<template>
  <div class="admin-shell">
    <slot />
    <AdminToasts />
    <!-- The sign-in ran out mid-edit. The text is kept on this device (see the
         editor's autosave), so signing in again loses nothing. -->
    <AdminDialog :open="signedOut" title="Signed out" @close="signedOut = false">
      <p>Your GitHub sign-in has expired. Your writing is kept on this device; sign in again to carry on.</p>
      <template #actions>
        <button class="admin-btn is-quiet" type="button" @click="signedOut = false">Later</button>
        <a class="admin-btn is-primary" :href="signInUrl(route.fullPath)">Sign in again</a>
      </template>
    </AdminDialog>
  </div>
</template>
