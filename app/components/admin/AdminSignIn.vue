<script setup lang="ts">
import type { AdminSession } from '#shared/admin'
import { signInUrl } from '~/utils/admin/api'
// The logo (scripts/brand/logo.py).
import logo from '~/assets/brand/logo.svg?raw'

/** Shown instead of the editor until the owner has signed in, or while setup is missing. */
const props = defineProps<{ session: AdminSession | null, failed?: boolean }>()

const route = useRoute()

const SIGNIN_ERRORS: Record<string, string> = {
  'cancelled': 'Sign-in was cancelled.',
  'expired': 'That sign-in took too long. Try again.',
  'failed': "GitHub didn't confirm the sign-in. Try again.",
  'not-allowed': 'That GitHub account is not allowed to edit this site.'
}

const error = computed(() => SIGNIN_ERRORS[String(route.query.signin ?? '')] ?? '')
const href = computed(() => signInUrl(route.path === '/admin' ? '/admin' : route.fullPath.replace(/[?&]signin=[^&]*/, '')))
const setup = computed(() => props.session?.setup ?? [])
</script>

<template>
  <div class="admin-center">
    <div class="admin-signin surface-card">
      <!-- A trusted, build-time asset, so v-html is safe here. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="brand-mark" aria-hidden="true" v-html="logo" />
      <template v-if="failed">
        <h1>Can't reach the editor</h1>
        <p>The server didn't answer. Check the connection and reload.</p>
      </template>
      <template v-else-if="setup.length">
        <h1>Almost there</h1>
        <p>Set these environment variables for the deployment, then redeploy (see "发帖工具" in the README):</p>
        <ul>
          <li v-for="name in setup" :key="name"><code>{{ name }}</code></li>
        </ul>
      </template>
      <template v-else>
        <h1>Editor</h1>
        <p>Sign in with the GitHub account that owns<br><strong>{{ session?.repo }}</strong>.</p>
        <a :href="href" class="admin-btn is-primary">
          <AppIcon name="github" :size="18" />
          Sign in with GitHub
        </a>
        <p v-if="error" class="admin-note" role="alert">{{ error }}</p>
      </template>
    </div>
  </div>
</template>
