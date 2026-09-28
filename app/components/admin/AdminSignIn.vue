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

const SETUP_HINTS: Record<string, string> = {
  NUXT_ADMIN_GITHUB_CLIENT_ID: 'The Client ID (starts with Iv), not the App ID.'
}

// Why GitHub refused a sign-in, when the server passed its reason along.
const FAILURE_DETAILS: Record<string, string> = {
  incorrect_client_credentials:
    "GitHub didn't accept the client secret. On the GitHub App's page, generate a new client secret, set it as NUXT_ADMIN_GITHUB_CLIENT_SECRET and redeploy.",
  bad_verification_code: 'That sign-in took too long. Try again.',
  unreachable: "Couldn't reach GitHub. Try again.",
  no_user: "GitHub didn't return your account. Try again."
}

const error = computed(() => {
  const reason = String(route.query.signin ?? '')
  const detail = String(route.query.detail ?? '')
  if (reason === 'failed' && detail) return FAILURE_DETAILS[detail] ?? `${SIGNIN_ERRORS.failed} (GitHub: ${detail})`
  return SIGNIN_ERRORS[reason] ?? ''
})
const href = computed(() =>
  signInUrl(route.path === '/admin' ? '/admin' : route.fullPath.replace(/[?&](?:signin|detail)=[^&]*/g, ''))
)
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
        <p>Set these environment variables for the deployment, then redeploy:</p>
        <ul>
          <li v-for="name in setup" :key="name">
            <code>{{ name }}</code>
            <span v-if="SETUP_HINTS[name]" class="admin-setup-hint">{{ SETUP_HINTS[name] }}</span>
          </li>
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
