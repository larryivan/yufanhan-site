<script setup lang="ts">
import type { PostSummary } from '#shared/admin'
import { SECTION_META } from '#shared/utils/sections'
import { AdminError, adminApi } from '~/utils/admin/api'
import { autosaveKey, clearAutosave, listUnsaved } from '~/utils/admin/autosave'
import type { UnsavedDraft } from '~/utils/admin/autosave'
import { useDeploy } from '~/utils/admin/deploy'
import { useAdminSession } from '~/utils/admin/session'
import { toast } from '~/utils/admin/toast'

definePageMeta({ layout: 'admin' })

/**
 * Every post, drafts included: search them, open one to edit, start a new one,
 * and publish, unpublish or delete one straight from its row.
 */

const { session, failed, load } = useAdminSession()
const { follow } = useDeploy()
const posts = ref<PostSummary[] | null>(null)
const loadError = ref('')
const unsaved = ref<UnsavedDraft[]>([])

type Filter = 'all' | 'blog' | 'life' | 'drafts'
const filter = ref<Filter>('all')
const query = ref('')

const signedIn = computed(() => Boolean(session.value?.user))
const isLocal = computed(() => session.value?.storage === 'local')

const fetchPosts = async () => {
  loadError.value = ''
  try {
    posts.value = (await adminApi.posts()).posts
  } catch (error) {
    loadError.value = error instanceof AdminError ? error.message : "Couldn't load the posts."
  }
}

onMounted(async () => {
  unsaved.value = listUnsaved()
  await load()
  if (signedIn.value) await fetchPosts()
})

const counts = computed(() => {
  const all = posts.value ?? []
  return {
    all: all.length,
    blog: all.filter((post) => post.section === 'blog').length,
    life: all.filter((post) => post.section === 'life').length,
    drafts: all.filter((post) => post.draft).length
  }
})

const FILTERS: { value: Filter, label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'blog', label: 'Blog' },
  { value: 'life', label: 'Life' },
  { value: 'drafts', label: 'Drafts' }
]

/** Every word must appear in the title, description, tags or URL. */
const shown = computed(() => {
  const words = query.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return (posts.value ?? []).filter((post) => {
    if (filter.value === 'drafts' && !post.draft) return false
    if ((filter.value === 'blog' || filter.value === 'life') && post.section !== filter.value) return false
    const text = `${post.title} ${post.description} ${post.tags.join(' ')} ${post.slug}`.toLowerCase()
    return words.every((word) => text.includes(word))
  })
})

const sitePath = (post: PostSummary) => `${SECTION_META[post.section].path}/${post.slug}`
const editLink = (post: PostSummary) => ({ path: '/admin/edit', query: { path: post.path } })

/* ---------------------------------------------------------------- row actions */

type Action = 'publish' | 'unpublish' | 'delete'
const pending = ref<{ action: Action, post: PostSummary } | null>(null)
const discarding = ref<UnsavedDraft | null>(null)
const busy = ref('')

const replacePost = (path: string, next: PostSummary | null) => {
  posts.value = (posts.value ?? []).flatMap((post) => (post.path === path ? (next ? [next] : []) : [post]))
}

/**
 * Publishing or unpublishing from the list saves the version in the repository
 * as it is, with only `draft` changed. A post with problems opens in the editor
 * instead, where they are listed.
 */
const setDraft = async (post: PostSummary, draft: boolean) => {
  const full = await adminApi.post(post.path)
  if (!draft && full.problems.length) {
    toast(`${full.title || 'This post'} has ${full.problems.length === 1 ? 'a problem' : `${full.problems.length} problems`} to fix first.`, {
      tone: 'error'
    })
    await navigateTo(editLink(post))
    return
  }
  const result = await adminApi.save({
    section: full.section,
    slug: full.slug,
    meta: { ...full.meta, draft },
    body: full.body,
    source: { path: full.path, sha: full.sha },
    uploads: []
  })
  replacePost(post.path, { ...post, sha: result.sha, draft })
  if (result.deploy) follow(result.commit, { draft, href: sitePath(post), local: isLocal.value })
  else toast('Saved')
}

const remove = async (post: PostSummary) => {
  const result = await adminApi.remove(post.path, post.sha)
  clearAutosave(autosaveKey({ path: post.path }))
  replacePost(post.path, null)
  toast(result.deploy ? 'Deleted. The site is updating…' : 'Deleted')
}

const confirm = async () => {
  if (!pending.value) return
  const { action, post } = pending.value
  pending.value = null
  busy.value = post.path
  try {
    if (action === 'delete') await remove(post)
    else await setDraft(post, action === 'unpublish')
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Something went wrong.', { tone: 'error' })
    // The list may be out of date (changed on another device): read it again.
    if (error instanceof AdminError && error.status === 409) await fetchPosts()
  } finally {
    busy.value = ''
  }
}

const discard = () => {
  if (!discarding.value) return
  clearAutosave(autosaveKey({ draft: discarding.value.id }))
  unsaved.value = unsaved.value.filter((draft) => draft.id !== discarding.value?.id)
  discarding.value = null
}

const DIALOGS: Record<Action, { title: string, button: string, text: (post: PostSummary) => string }> = {
  publish: {
    title: 'Publish?',
    button: 'Publish',
    text: (post) => `"${post.title}" goes live at ${sitePath(post)}.`
  },
  unpublish: {
    title: 'Unpublish?',
    button: 'Unpublish',
    text: (post) => `"${post.title}" comes off the site and stays here as a draft.`
  },
  delete: {
    title: 'Delete this post?',
    button: 'Delete',
    text: (post) =>
      `"${post.title}" and its uploaded files are deleted${post.draft ? '' : ' and taken off the site'}. The repository's history keeps a copy.`
  }
}
</script>

<template>
  <div>
    <AdminBar>
      <template #actions>
        <AdminThemeButton />
        <AdminAccount />
      </template>
    </AdminBar>

    <AdminSignIn v-if="session && !signedIn" :session="session" />
    <AdminSignIn v-else-if="failed" :session="null" failed />

    <main v-else-if="signedIn" class="admin-main">
      <header class="admin-head">
        <div>
          <h1>Posts</h1>
          <p v-if="isLocal">Local files · saves go straight into content/</p>
          <p v-else-if="session?.repo">{{ session.repo }}</p>
        </div>
        <NuxtLink to="/admin/edit" class="admin-btn is-primary">
          <AdminIcon name="plus" :size="16" />
          New post
        </NuxtLink>
      </header>

      <ul v-if="unsaved.length" class="admin-list surface-card admin-unsaved">
        <li v-for="draft in unsaved" :key="draft.id" class="admin-row">
          <NuxtLink :to="{ path: '/admin/edit', query: { draft: draft.id } }" class="admin-row-main">
            <span class="admin-row-title">{{ draft.title || 'Untitled' }}</span>
            <span class="admin-row-meta"><span class="admin-row-draft">Unsaved</span> Only on this device · {{ draft.when }}</span>
          </NuxtLink>
          <AdminMenu :label="`Actions for ${draft.title || 'Untitled'}`">
            <template #button><AdminIcon name="more" /></template>
            <NuxtLink :to="{ path: '/admin/edit', query: { draft: draft.id } }" role="menuitem">
              <AdminIcon name="pencil" :size="16" />
              Continue writing
            </NuxtLink>
            <hr>
            <button type="button" role="menuitem" class="is-danger" @click="discarding = draft">
              <AdminIcon name="trash" :size="16" />
              Discard
            </button>
          </AdminMenu>
        </li>
      </ul>

      <div class="admin-filters">
        <div class="admin-segmented" role="group" aria-label="Show">
          <button
            v-for="item in FILTERS"
            :key="item.value"
            type="button"
            :aria-pressed="filter === item.value"
            @click="filter = item.value"
          >
            {{ item.label }}<span class="count">{{ counts[item.value] }}</span>
          </button>
        </div>
        <label class="admin-search">
          <AppIcon name="search" :size="16" />
          <input v-model="query" type="search" placeholder="Search titles, descriptions, tags" aria-label="Search posts">
        </label>
      </div>

      <p v-if="loadError" class="admin-empty surface-card" role="alert">
        {{ loadError }}
        <br><button class="admin-btn is-small" type="button" style="margin-top: 12px" @click="fetchPosts">Try again</button>
      </p>
      <div v-else-if="!posts" class="admin-empty surface-card"><span class="admin-spinner" /></div>
      <ul v-else-if="shown.length" class="admin-list surface-card">
        <li v-for="post in shown" :key="post.path" class="admin-row" :class="{ 'is-busy': busy === post.path }">
          <NuxtLink :to="editLink(post)" class="admin-row-main">
            <span class="admin-row-title">{{ post.title }}</span>
            <span class="admin-row-meta">
              <span class="admin-plate">{{ SECTION_META[post.section].label }}</span>
              <time v-if="post.date" :datetime="post.date">{{ formatDate(post.date) || post.date }}</time>
              <span v-if="post.draft" class="admin-row-draft">Draft</span>
            </span>
          </NuxtLink>
          <span v-if="busy === post.path" class="admin-spinner" />
          <AdminMenu :label="`Actions for ${post.title}`">
            <template #button><AdminIcon name="more" /></template>
            <NuxtLink :to="editLink(post)" role="menuitem">
              <AdminIcon name="pencil" :size="16" />
              Edit
            </NuxtLink>
            <a v-if="!post.draft" :href="sitePath(post)" target="_blank" rel="noopener" role="menuitem">
              <AdminIcon name="external" :size="16" />
              View on the site
            </a>
            <button v-if="post.draft" type="button" role="menuitem" @click="pending = { action: 'publish', post }">
              <AdminIcon name="globe" :size="16" />
              Publish
            </button>
            <button v-else type="button" role="menuitem" @click="pending = { action: 'unpublish', post }">
              <AdminIcon name="draft" :size="16" />
              Unpublish
            </button>
            <hr>
            <button type="button" role="menuitem" class="is-danger" @click="pending = { action: 'delete', post }">
              <AdminIcon name="trash" :size="16" />
              Delete
            </button>
          </AdminMenu>
        </li>
      </ul>
      <p v-else class="admin-empty surface-card">
        {{ query ? 'Nothing matches.' : filter === 'drafts' ? 'No drafts.' : 'No posts yet.' }}
      </p>
    </main>

    <AdminDialog :open="Boolean(pending)" :title="pending ? DIALOGS[pending.action].title : ''" @close="pending = null">
      <p v-if="pending">{{ DIALOGS[pending.action].text(pending.post) }}</p>
      <template #actions>
        <button class="admin-btn is-quiet" type="button" @click="pending = null">Cancel</button>
        <button
          class="admin-btn is-primary"
          :class="{ 'is-danger': pending?.action === 'delete' }"
          type="button"
          @click="confirm"
        >
          {{ pending ? DIALOGS[pending.action].button : '' }}
        </button>
      </template>
    </AdminDialog>

    <AdminDialog :open="Boolean(discarding)" title="Discard this post?" @close="discarding = null">
      <p>It was never saved, so it's gone for good.</p>
      <template #actions>
        <button class="admin-btn is-quiet" type="button" @click="discarding = null">Cancel</button>
        <button class="admin-btn is-primary is-danger" type="button" @click="discard">Discard</button>
      </template>
    </AdminDialog>
  </div>
</template>
