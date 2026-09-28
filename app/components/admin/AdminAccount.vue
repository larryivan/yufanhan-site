<script setup lang="ts">
import { adminApi } from '~/utils/admin/api'
import { useAdminSession } from '~/utils/admin/session'

/** Who is signed in, and signing out. Locally it says where saves go instead. */
const { session, load } = useAdminSession()

const signOut = async () => {
  await adminApi.logout().catch(() => {})
  await load(true)
  await navigateTo('/admin')
}
</script>

<template>
  <AdminMenu v-if="session?.user" label="Account">
    <template #button>
      <img v-if="session.user.avatar" :src="session.user.avatar" alt="" class="admin-avatar">
      <AdminIcon v-else :name="session.storage === 'local' ? 'desktop' : 'draft'" />
    </template>
    <div class="admin-menu-label">
      <template v-if="session.storage === 'local'">Saving to this computer's files</template>
      <template v-else>Signed in as {{ session.user.login }} · {{ session.repo }}</template>
    </div>
    <a href="/" target="_blank" rel="noopener" role="menuitem">
      <AdminIcon name="external" :size="16" />
      View site
    </a>
    <template v-if="session.storage === 'github'">
      <hr>
      <button type="button" role="menuitem" @click="signOut">
        <AdminIcon name="logout" :size="16" />
        Sign out
      </button>
    </template>
  </AdminMenu>
</template>
