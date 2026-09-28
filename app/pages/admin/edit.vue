<script setup lang="ts">
import type { EditorView } from '@codemirror/view'
import type { PostMeta, PreviewPost, Problem } from '#shared/admin'
import { SECTION_META, POST_SECTIONS } from '#shared/utils/sections'
import type { PostSection } from '#shared/utils/sections'
import type { ImageItem } from '~/components/admin/AdminImageDialog.vue'
import type { ToolbarCommand } from '~/components/admin/AdminToolbar.vue'
import { AdminError, adminApi, isAbort } from '~/utils/admin/api'
import { autosaveKey, clearAutosave, readAutosave, timeAgo, writeAutosave } from '~/utils/admin/autosave'
import { useDeploy } from '~/utils/admin/deploy'
import type { Autosave, EditorSnapshot, PendingUpload } from '~/utils/admin/autosave'
import {
  cycleHeading,
  imageMarkdown,
  insertBlock,
  insertCallout,
  insertCode,
  insertFootnote,
  insertInline,
  insertLink,
  insertMath,
  insertTable,
  linkMarkdown,
  toggleLinePrefix,
  toggleWrap
} from '~/utils/admin/editing'
import type { CALLOUTS } from '~/utils/admin/editing'
import { isImageFile, prepareAttachment, prepareImage } from '~/utils/admin/media'
import type { PreparedFile } from '~/utils/admin/media'
import { useAdminSession } from '~/utils/admin/session'
import { slugify } from '~/utils/admin/slug'
import { dismissToast, toast, toasts } from '~/utils/admin/toast'

definePageMeta({ layout: 'admin' })

/**
 * Writing a post: its fields and Markdown on the left, the page it becomes on
 * the right (below 1000px, one or the other). Work in progress is kept on this
 * device as it is typed; Save draft and Publish commit it.
 */

const route = useRoute()
const router = useRouter()
const { session, failed: sessionFailed, load: loadSession } = useAdminSession()
const { theme, toggle: toggleTheme } = useTheme()

const editor = ref<{
  run: (command: (view: EditorView) => boolean) => boolean
  undo: () => boolean
  redo: () => boolean
  focus: () => void
  goToLine: (line: number) => void
} | null>(null)

/* ---------------------------------------------------------------- the post */

const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const emptyMeta = (): PostMeta => ({
  title: '',
  description: '',
  date: today(),
  updatedAt: '',
  tags: [],
  cover: '',
  draft: true,
  extra: {}
})

interface Source {
  path: string
  sha: string
  section: PostSection
  slug: string
  draft: boolean
}

const section = ref<PostSection>('blog')
const slug = ref('')
const slugTouched = ref(false)
const meta = ref<PostMeta>(emptyMeta())
const body = ref('')
const pending = ref<PendingUpload[]>([])
/** The version in the repository, once there is one. */
const source = ref<Source | null>(null)
const draftId = ref('')

const loading = ref(true)
const loadError = ref('')
const signedIn = computed(() => Boolean(session.value?.user))
const isPublished = computed(() => Boolean(source.value && !source.value.draft))

const snapshot = (): EditorSnapshot => ({
  section: section.value,
  slug: slug.value,
  slugTouched: slugTouched.value,
  meta: JSON.parse(JSON.stringify(meta.value)),
  body: body.value,
  uploads: pending.value.map((upload) => ({ ...upload }))
})

/** What counts as a change: not whether the slug was typed or derived. */
const comparable = (state: EditorSnapshot) =>
  JSON.stringify([state.section, state.slug, state.meta, state.body, state.uploads.map((upload) => upload.sha)])

const savedState = ref('')
const current = computed(() => comparable(snapshot()))
const dirty = computed(() => !loading.value && current.value !== savedState.value)

const applySnapshot = (state: EditorSnapshot) => {
  section.value = state.section
  slug.value = state.slug
  slugTouched.value = state.slugTouched
  meta.value = { ...emptyMeta(), ...state.meta }
  body.value = state.body
  pending.value = state.uploads ?? []
}

/* ---------------------------------------------------------------- autosave */

const storageKey = computed(() => autosaveKey({ path: source.value?.path, draft: draftId.value }))
const restoreOffer = ref<Autosave | null>(null)
let autosaveTimer: ReturnType<typeof setTimeout> | undefined

watch(current, () => {
  if (loading.value || restoreOffer.value) return
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    if (!dirty.value) return clearAutosave(storageKey.value)
    writeAutosave(storageKey.value, {
      savedAt: Date.now(),
      base: source.value ? { path: source.value.path, sha: source.value.sha } : undefined,
      snapshot: snapshot()
    })
  }, 500)
})

const restore = () => {
  if (restoreOffer.value) applySnapshot(restoreOffer.value.snapshot)
  restoreOffer.value = null
  nextTick(fitFields)
}

const discardRestore = () => {
  clearAutosave(storageKey.value)
  restoreOffer.value = null
}

/* ---------------------------------------------------------------- loading */

const tagSuggestions = ref<string[]>([])

const load = async () => {
  loading.value = true
  loadError.value = ''
  await loadSession()
  if (!signedIn.value) {
    loading.value = false
    return
  }

  const path = typeof route.query.path === 'string' ? route.query.path : ''
  if (path) {
    try {
      const post = await adminApi.post(path)
      source.value = { path: post.path, sha: post.sha, section: post.section, slug: post.slug, draft: post.draft }
      applySnapshot({ section: post.section, slug: post.slug, slugTouched: true, meta: post.meta, body: post.body, uploads: [] })
      savedState.value = current.value
      problems.value = post.problems
      const saved = readAutosave(autosaveKey({ path }))
      if (saved && comparable(saved.snapshot) !== savedState.value) restoreOffer.value = saved
    } catch (error) {
      loadError.value = error instanceof AdminError ? error.message : "Couldn't open this post."
    }
  } else {
    const requested = typeof route.query.draft === 'string' ? route.query.draft : ''
    draftId.value = /^[a-z0-9-]{8,40}$/.test(requested) ? requested : crypto.randomUUID()
    if (requested !== draftId.value) await router.replace({ query: { draft: draftId.value } })
    savedState.value = comparable({ section: 'blog', slug: '', slugTouched: false, meta: emptyMeta(), body: '', uploads: [] })
    // A new post's only copy: open it as it was.
    const saved = readAutosave(autosaveKey({ draft: draftId.value }))
    if (saved) applySnapshot(saved.snapshot)
  }
  loading.value = false

  adminApi
    .posts()
    .then(({ posts }) => {
      tagSuggestions.value = [...new Set(posts.flatMap((post) => post.tags))].sort((a, b) => a.localeCompare(b))
    })
    .catch(() => {})
}

onMounted(load)

// The URL follows the title until it is typed by hand, and a saved post keeps its own.
watch(
  () => meta.value.title,
  (title) => {
    if (!loading.value && !source.value && !slugTouched.value) slug.value = slugify(title)
  }
)

const onSlugInput = (event: Event) => {
  slugTouched.value = true
  slug.value = (event.target as HTMLInputElement).value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '')
}

const tidySlug = () => {
  slug.value = slug.value.replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/* ---------------------------------------------------------------- preview */

const preview = shallowRef<PreviewPost | null>(null)
const problems = shallowRef<Problem[]>([])
const previewFailed = ref(false)
const tab = ref<'write' | 'preview'>('write')
const device = ref<'wide' | 'phone'>('wide')
const wideScreen = ref(true)
/** On a wide screen the preview can be put away, leaving the text alone in the middle. */
const showPreview = ref(true)
const LAYOUT_KEY = 'yufanhan-editor:layout'

const togglePreview = () => {
  if (!wideScreen.value) {
    tab.value = tab.value === 'write' ? 'preview' : 'write'
    return
  }
  showPreview.value = !showPreview.value
  try {
    localStorage.setItem(LAYOUT_KEY, showPreview.value ? 'split' : 'solo')
  } catch {
    // Blocked storage: the choice lasts until the page is left.
  }
}

onMounted(() => {
  try {
    showPreview.value = localStorage.getItem(LAYOUT_KEY) !== 'solo'
  } catch {
    // Blocked storage: the preview shows.
  }
})
let previewTimer: ReturnType<typeof setTimeout> | undefined
let previewRequest: AbortController | null = null

const runPreview = async () => {
  previewRequest?.abort()
  const request = (previewRequest = new AbortController())
  try {
    const result = await adminApi.preview(
      { section: section.value, slug: slug.value, meta: JSON.parse(JSON.stringify(meta.value)), body: body.value },
      request.signal
    )
    if (request !== previewRequest) return
    preview.value = result.post
    problems.value = result.problems
    previewFailed.value = false
  } catch (error) {
    if (!isAbort(error)) previewFailed.value = true
  }
}

// Slower while the preview is out of sight: only the problem count needs it then.
const schedulePreview = () => {
  clearTimeout(previewTimer)
  const visible = wideScreen.value ? showPreview.value : tab.value === 'preview'
  previewTimer = setTimeout(runPreview, visible ? 350 : 1200)
}

watch([current, loading], () => {
  if (!loading.value && signedIn.value && !loadError.value) schedulePreview()
})
watch(tab, (value) => {
  if (value === 'preview') runPreview()
})

let wideQuery: MediaQueryList | null = null
const onWide = () => {
  wideScreen.value = Boolean(wideQuery?.matches)
}
onMounted(() => {
  wideQuery = window.matchMedia('(min-width: 1000px)')
  onWide()
  wideQuery.addEventListener('change', onWide)
})
onBeforeUnmount(() => {
  wideQuery?.removeEventListener('change', onWide)
  clearTimeout(previewTimer)
  clearTimeout(autosaveTimer)
  previewRequest?.abort()
})

/* ---------------------------------------------------------------- problems */

const showFieldErrors = ref(false)
const problemsMenu = ref<{ show: () => void } | null>(null)

const showProblems = async () => {
  await nextTick()
  problemsMenu.value?.show()
}

const fieldProblem = (field: string) =>
  showFieldErrors.value ? problems.value.find((problem) => problem.field === field || problem.field?.startsWith(`${field}.`))?.message : undefined

/** Problems in the text itself, shown as they appear; the fields' wait for Publish. */
const textProblems = computed(() => problems.value.filter((problem) => !problem.field))
const shownProblems = computed(() => (showFieldErrors.value ? problems.value : textProblems.value))

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  date: 'Date',
  updatedAt: 'Updated',
  tags: 'Tags',
  cover: 'Cover',
  slug: 'URL',
  frontmatter: 'Frontmatter'
}

const problemLabel = (problem: Problem) =>
  problem.line ? `Line ${problem.line}` : (FIELD_LABELS[problem.field?.split('.')[0] ?? ''] ?? '')

const goToProblem = (problem: Problem) => {
  tab.value = 'write'
  if (problem.line) return nextTick(() => editor.value?.goToLine(problem.line!))
  const field = problem.field?.split('.')[0]
  nextTick(() => document.querySelector<HTMLElement>(`[data-field="${field}"]`)?.focus())
}

/** The metadata line's own problems, listed under it once Publish has been tried. */
const metaProblems = computed(() => {
  if (!showFieldErrors.value) return []
  const listed = problems.value
    .filter((problem) => problem.field && !['title', 'description'].includes(problem.field.split('.')[0]!))
    .map((problem) => `${problemLabel(problem)}: ${problem.message}`)
  if (!slug.value && !listed.some((line) => line.startsWith('URL'))) {
    listed.unshift('URL: lowercase letters, digits and hyphens, typed after the section')
  }
  return listed
})

/* ---------------------------------------------------------------- uploads */

/** Local copies of this session's uploads, so the preview shows them before any request. */
const localUrls = new Map<string, string>()
const siteUrlOf = (upload: PendingUpload) => upload.path.replace(/^public/, '')

// Uploads made before the post has a URL wait in an `untitled` folder until Save moves them.
const uploadFolder = () => slug.value || 'untitled'

const media = computed(() => {
  const map: Record<string, string> = {}
  for (const upload of pending.value) {
    const url = siteUrlOf(upload)
    map[url] = localUrls.get(url) ?? `/api/admin/file?sha=${upload.sha}&name=${encodeURIComponent(upload.name)}`
  }
  return map
})

const errorText = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.')

const store = async (prepared: PreparedFile) => {
  const { sha } = await adminApi.upload(prepared.blob)
  const upload: PendingUpload = {
    path: `public/${prepared.kind}/${uploadFolder()}/${prepared.name}`,
    sha,
    kind: prepared.kind,
    name: prepared.name,
    type: prepared.blob.type
  }
  pending.value = [...pending.value.filter((item) => item.path !== upload.path), upload]
  localUrls.set(siteUrlOf(upload), URL.createObjectURL(prepared.blob))
  return upload
}

type ImageEntry = ImageItem & { upload?: PendingUpload, width?: number, height?: number }
const imageItems = ref<ImageEntry[]>([])
const imageDialog = ref(false)
let nextImageId = 1

const updateImage = (id: number, patch: Partial<ImageEntry>) => {
  imageItems.value = imageItems.value.map((item) => (item.id === id ? { ...item, ...patch } : item))
}

const processImage = async (id: number, file: File) => {
  try {
    const prepared = await prepareImage(file)
    const upload = await store(prepared)
    updateImage(id, { status: 'ready', thumb: localUrls.get(siteUrlOf(upload)), upload, width: prepared.width, height: prepared.height })
  } catch (error) {
    updateImage(id, { status: 'error', error: errorText(error) })
  }
}

const attachFile = async (file: File) => {
  const notice = toast(`Uploading ${file.name}…`, { timeout: 0 })
  try {
    const upload = await store(await prepareAttachment(file))
    editor.value?.run((view) => insertInline(view, linkMarkdown(siteUrlOf(upload), file.name)))
  } catch (error) {
    toast(errorText(error), { tone: 'error' })
  } finally {
    dismissToast(notice)
  }
}

const addFiles = (files: File[]) => {
  const images = files.filter(isImageFile)
  files.filter((file) => !isImageFile(file)).forEach(attachFile)
  if (!images.length) return
  const items: ImageEntry[] = images.map((file) => ({ id: nextImageId++, fileName: file.name, status: 'working', alt: '', caption: '' }))
  imageItems.value = [...(imageDialog.value ? imageItems.value : []), ...items]
  imageDialog.value = true
  items.forEach((item, index) => processImage(item.id, images[index]!))
}

const insertImages = () => {
  const text = imageItems.value
    .filter((item) => item.status === 'ready' && item.upload)
    .map((item) => imageMarkdown(siteUrlOf(item.upload!), item.alt, item.caption, item.width, item.height))
    .join('\n\n')
  imageDialog.value = false
  imageItems.value = []
  if (text) nextTick(() => editor.value?.run((view) => insertBlock(view, text)))
}

const cancelImages = () => {
  imageDialog.value = false
  imageItems.value = []
}

const editImage = (id: number, field: 'alt' | 'caption', value: string) => updateImage(id, { [field]: value })

const imageInput = ref<HTMLInputElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)
const coverBusy = ref(false)

const picked = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  return files
}

const onCoverPicked = async (event: Event) => {
  const [file] = picked(event)
  if (!file) return
  coverBusy.value = true
  try {
    const upload = await store(await prepareImage(file))
    meta.value.cover = siteUrlOf(upload)
  } catch (error) {
    toast(errorText(error), { tone: 'error' })
  } finally {
    coverBusy.value = false
  }
}

const coverThumb = computed(() => {
  const cover = meta.value.cover
  if (!cover) return ''
  if (media.value[cover]) return media.value[cover]
  if (/^\/(?:images|files)\//.test(cover)) return `/api/admin/file?path=${encodeURIComponent(`public${cover}`)}`
  return cover
})

/* ---------------------------------------------------------------- toolbar */

const onCommand = (command: ToolbarCommand) => {
  const run = (fn: Parameters<NonNullable<typeof editor.value>['run']>[0]) => editor.value?.run(fn)
  switch (command) {
    case 'bold':
      return run((view) => toggleWrap(view, '**'))
    case 'italic':
      return run((view) => toggleWrap(view, '*'))
    case 'link':
      return run(insertLink)
    case 'heading':
      return run(cycleHeading)
    case 'quote':
      return run((view) => toggleLinePrefix(view, '> ', /^>\s?/))
    case 'list':
      return run((view) => toggleLinePrefix(view, '- ', /^\s*[-*+]\s(?:\[[ xX]\]\s)?/))
    case 'code':
      return run(insertCode)
    case 'math-inline':
      return run((view) => insertMath(view, false))
    case 'math-display':
      return run((view) => insertMath(view, true))
    case 'table':
      return run(insertTable)
    case 'footnote':
      return run(insertFootnote)
    case 'image':
      return imageInput.value?.click()
    case 'attach':
      return fileInput.value?.click()
    case 'undo':
      return editor.value?.undo()
    case 'redo':
      return editor.value?.redo()
    default:
      return run((view) => insertCallout(view, command.slice('callout-'.length) as (typeof CALLOUTS)[number]))
  }
}

/* ---------------------------------------------------------------- saving */

const saving = ref<false | 'draft' | 'publish'>(false)
const conflict = ref<{ message: string, draft: boolean } | null>(null)
const renameConfirm = ref<{ draft: boolean } | null>(null)
const deleteConfirm = ref(false)
const unpublishConfirm = ref(false)
const deleting = ref(false)
const { building, follow } = useDeploy()

const sitePath = computed(() => `${SECTION_META[section.value].path}/${slug.value}`)

/**
 * The text and uploads to commit. Uploads move to the post's folders under its
 * final URL, a renamed post's folders follow its new slug, and uploads no longer
 * used anywhere in the post are left out.
 */
const finalize = () => {
  let text = body.value
  let cover = meta.value.cover
  const replace = (from: string, to: string) => {
    if (from === to) return
    text = text.split(from).join(to)
    if (cover === from || (from.endsWith('/') && cover.startsWith(from))) cover = to + cover.slice(from.length)
  }
  if (source.value && source.value.slug !== slug.value) {
    for (const kind of ['images', 'files']) replace(`/${kind}/${source.value.slug}/`, `/${kind}/${slug.value}/`)
  }
  const uploads: { path: string, sha: string }[] = []
  for (const upload of pending.value) {
    const final = `/${upload.kind}/${slug.value}/${upload.name}`
    replace(siteUrlOf(upload), final)
    if (text.includes(final) || cover === final) uploads.push({ path: `public${final}`, sha: upload.sha })
  }
  return { text, cover, uploads }
}

const save = async (draft: boolean, options: { force?: boolean, confirmed?: boolean } = {}) => {
  if (saving.value || loading.value) return
  if (!draft) showFieldErrors.value = true
  tidySlug()
  if (!slug.value) {
    showFieldErrors.value = true
    toast('The post needs a URL. Type one under the title.', { tone: 'error' })
    nextTick(() => document.querySelector<HTMLElement>('[data-field="slug"]')?.focus())
    return
  }
  const moved = source.value && (source.value.slug !== slug.value || source.value.section !== section.value)
  if (moved && isPublished.value && !options.confirmed) {
    renameConfirm.value = { draft }
    return
  }
  if (!draft && problems.value.length) {
    toast('Fix the problems before publishing.', { tone: 'error' })
    showProblems()
    return
  }

  saving.value = draft ? 'draft' : 'publish'
  // Notices about an earlier attempt no longer apply.
  toasts.value = []
  const { text, cover, uploads } = finalize()
  const keyBefore = storageKey.value
  try {
    const result = await adminApi.save({
      section: section.value,
      slug: slug.value,
      meta: { ...JSON.parse(JSON.stringify(meta.value)), cover, draft },
      body: text,
      source: source.value ? { path: source.value.path, sha: source.value.sha } : undefined,
      uploads,
      force: options.force
    })
    body.value = text
    meta.value = { ...meta.value, cover, draft }
    pending.value = []
    source.value = { path: result.path, sha: result.sha, section: section.value, slug: slug.value, draft }
    savedState.value = current.value
    clearAutosave(keyBefore)
    clearAutosave(storageKey.value)
    showFieldErrors.value = false
    if (route.query.path !== result.path) await router.replace({ query: { path: result.path } })
    if (result.deploy) follow(result.commit, { draft, href: sitePath.value, local: session.value?.storage === 'local' })
    else toast(draft ? 'Draft saved' : 'Saved')
  } catch (error) {
    if (error instanceof AdminError && error.status === 409 && (error.code === 'changed' || error.code === 'deleted')) {
      conflict.value = { message: error.message, draft }
    } else if (error instanceof AdminError && error.problems.length) {
      problems.value = error.problems
      showFieldErrors.value = true
      toast(error.message, { tone: 'error' })
      showProblems()
    } else {
      toast(errorText(error), { tone: 'error' })
    }
  } finally {
    saving.value = false
  }
}

const saveShortcut = () => save(source.value ? source.value.draft : true)

const overwrite = () => {
  const draft = conflict.value?.draft ?? true
  conflict.value = null
  save(draft, { force: true, confirmed: true })
}

const confirmRename = () => {
  const draft = renameConfirm.value?.draft ?? true
  renameConfirm.value = null
  save(draft, { confirmed: true })
}

const unpublish = () => {
  unpublishConfirm.value = false
  save(true, { confirmed: true })
}

const remove = async () => {
  if (!source.value) return
  deleting.value = true
  try {
    await adminApi.remove(source.value.path, source.value.sha)
    clearAutosave(storageKey.value)
    savedState.value = current.value
    deleteConfirm.value = false
    toast('Deleted')
    await navigateTo('/admin')
  } catch (error) {
    toast(errorText(error), { tone: 'error' })
  } finally {
    deleting.value = false
  }
}

const discardNew = async () => {
  clearAutosave(storageKey.value)
  savedState.value = current.value
  deleteConfirm.value = false
  await navigateTo('/admin')
}

/* ---------------------------------------------------------------- the bar */

/** The bar's one line of status: where the post stands, and how long it is. */
const statusText = computed(() => {
  if (!signedIn.value || loading.value || loadError.value) return ''
  const state = saving.value
    ? saving.value === 'publish'
      ? isPublished.value ? 'Updating…' : 'Publishing…'
      : 'Saving…'
    : building.value
      ? 'Building the site…'
      : dirty.value
        ? 'Unsaved changes'
        : !source.value
            ? 'New post'
            : source.value.draft
              ? 'Draft'
              : 'Published'
  const words = preview.value?.words ? `${preview.value.words.toLocaleString()} words` : ''
  return [state, words].filter(Boolean).join(' · ')
})

/* ---------------------------------------------------------------- fields */

const autoGrow = (event: Event) => {
  const field = event.target as HTMLTextAreaElement
  field.style.height = 'auto'
  field.style.height = `${field.scrollHeight}px`
}

const titleField = ref<HTMLTextAreaElement | null>(null)
const descField = ref<HTMLTextAreaElement | null>(null)

// Measured again once the display face has loaded (the fallback font wraps
// differently) and whenever the width changes.
const fitFields = () => {
  for (const field of [titleField.value, descField.value]) {
    if (!field) continue
    field.style.height = 'auto'
    field.style.height = `${field.scrollHeight}px`
  }
}

watch(loading, async (value) => {
  if (value) return
  await nextTick()
  fitFields()
  document.fonts?.ready.then(fitFields)
  if (!source.value && !meta.value.title) titleField.value?.focus()
})
watch(tab, () => nextTick(fitFields))
onMounted(() => window.addEventListener('resize', fitFields))
onBeforeUnmount(() => window.removeEventListener('resize', fitFields))

/* The toolbar takes a background only once it sticks over the text. */
const toolbar = ref<{ $el: HTMLElement } | null>(null)
const toolbarSentinel = ref<HTMLElement | null>(null)
const toolbarStuck = ref(false)
let stuckObserver: IntersectionObserver | null = null

const observeToolbar = () => {
  stuckObserver?.disconnect()
  const element = toolbar.value?.$el
  if (!toolbarSentinel.value || !element) return
  const top = Number.parseFloat(getComputedStyle(element).top) || 0
  stuckObserver = new IntersectionObserver(
    ([entry]) => {
      toolbarStuck.value = Boolean(entry && !entry.isIntersecting && entry.boundingClientRect.top < top + 2)
    },
    { rootMargin: `${-Math.round(top) - 1}px 0px 0px 0px` }
  )
  stuckObserver.observe(toolbarSentinel.value)
}

watch([loading, wideScreen], async () => {
  await nextTick()
  observeToolbar()
})
onBeforeUnmount(() => stuckObserver?.disconnect())

const setUpdatedToday = () => {
  meta.value.updatedAt = today()
}

/** The date fields show a formatted day; a click opens the browser's own picker. */
const openPicker = (event: Event) => {
  try {
    ;(event.target as HTMLInputElement).showPicker?.()
  } catch {
    // Not allowed here (an old browser): the field still takes typing.
  }
}

useHead({ title: () => (meta.value.title ? `${meta.value.title} · Editor` : 'Editor') })
</script>

<template>
  <div class="editor" :class="[`show-${tab}`, { 'is-solo': !showPreview }]">
    <AdminBar back="/admin">
      <span v-if="statusText" class="editor-state" :class="{ 'is-dirty': dirty || !source }">
        <span v-if="saving || building" class="admin-spinner" />
        <span v-else class="editor-state-dot" aria-hidden="true" />
        <span class="editor-state-text">{{ statusText }}</span>
      </span>
      <template #actions>
        <template v-if="signedIn && !loadError && !loading">
          <AdminMenu
            v-if="shownProblems.length"
            ref="problemsMenu"
            :label="`${shownProblems.length} ${shownProblems.length === 1 ? 'problem' : 'problems'}`"
            button-class="bar-problems"
          >
            <template #button><AdminIcon name="alert" :size="15" />{{ shownProblems.length }}</template>
            <button
              v-for="(problem, index) in shownProblems"
              :key="index"
              type="button"
              role="menuitem"
              class="problem-item"
              @click="goToProblem(problem)"
            >
              <strong v-if="problemLabel(problem)">{{ problemLabel(problem) }}</strong>
              <span>{{ problem.message }}</span>
            </button>
          </AdminMenu>
          <!-- Wide: the preview beside the text, or put away. Narrow: one at a time. -->
          <button
            class="icon-btn editor-view-toggle"
            type="button"
            :aria-pressed="wideScreen ? showPreview : tab === 'preview'"
            :aria-label="wideScreen ? 'Preview beside the text' : 'Preview'"
            :title="wideScreen ? (showPreview ? 'Hide the preview' : 'Show the preview') : tab === 'write' ? 'Preview' : 'Write'"
            @click="togglePreview"
          >
            <AdminIcon :name="wideScreen ? 'columns' : tab === 'write' ? 'eye' : 'pencil'" />
          </button>
          <button
            v-if="!isPublished"
            class="admin-btn is-quiet editor-save"
            type="button"
            :disabled="Boolean(saving)"
            @click="save(true)"
          >
            <span v-if="saving === 'draft'" class="admin-spinner" />
            <span>Save<span class="editor-hide-sm"> draft</span></span>
          </button>
          <button
            class="admin-btn is-primary"
            type="button"
            :disabled="Boolean(saving) || (isPublished && !dirty)"
            @click="save(false)"
          >
            <span v-if="saving === 'publish'" class="admin-spinner" />
            {{ isPublished ? 'Update' : 'Publish' }}
          </button>
          <AdminMenu label="More">
            <template #button><AdminIcon name="more" /></template>
            <button
              v-if="wideScreen && showPreview"
              type="button"
              role="menuitemcheckbox"
              :aria-checked="device === 'phone'"
              @click="device = device === 'phone' ? 'wide' : 'phone'"
            >
              <AdminIcon name="phone" :size="16" />
              Phone-width preview
              <AppIcon v-if="device === 'phone'" name="check" :size="15" class="menu-check" />
            </button>
            <button type="button" role="menuitemcheckbox" :aria-checked="theme === 'dark'" @click="toggleTheme">
              <AppIcon name="moon" :size="16" />
              Dark theme
              <AppIcon v-if="theme === 'dark'" name="check" :size="15" class="menu-check" />
            </button>
            <button v-if="isPublished && !meta.updatedAt" type="button" role="menuitem" @click="setUpdatedToday">
              <AdminIcon name="plus" :size="16" />
              Mark as updated today
            </button>
            <hr>
            <a v-if="isPublished" :href="sitePath" target="_blank" rel="noopener" role="menuitem">
              <AdminIcon name="external" :size="16" />
              View on the site
            </a>
            <button v-if="isPublished" type="button" role="menuitem" @click="unpublishConfirm = true">
              <AdminIcon name="draft" :size="16" />
              Unpublish
            </button>
            <button type="button" role="menuitem" class="is-danger" @click="deleteConfirm = true">
              <AdminIcon name="trash" :size="16" />
              {{ source ? 'Delete post' : 'Discard' }}
            </button>
          </AdminMenu>
        </template>
      </template>
    </AdminBar>

    <AdminSignIn v-if="session && !signedIn" :session="session" />
    <AdminSignIn v-else-if="sessionFailed" :session="null" failed />
    <div v-else-if="loadError" class="admin-center">
      <div class="admin-signin surface-card">
        <h1>Can't open this post</h1>
        <p>{{ loadError }}</p>
        <NuxtLink to="/admin" class="admin-btn">All posts</NuxtLink>
      </div>
    </div>
    <div v-else-if="loading" class="admin-center"><span class="admin-spinner" /></div>

    <template v-else>
      <div v-if="restoreOffer" class="editor-restore" role="status">
        <span>Unsaved changes from {{ timeAgo(restoreOffer.savedAt) }} on this device<template v-if="source && restoreOffer.base?.sha !== source.sha">, made on an older version</template>.</span>
        <button class="admin-btn is-small is-primary" type="button" @click="restore">Restore</button>
        <button class="admin-btn is-small is-quiet" type="button" @click="discardRestore">Discard</button>
      </div>

      <div class="editor-grid">
        <section class="editor-pane" aria-label="Write">
          <div class="editor-doc">
            <textarea
              ref="titleField"
              v-model="meta.title"
              data-field="title"
              class="editor-title"
              rows="1"
              placeholder="Title"
              aria-label="Title"
              enterkeyhint="next"
              :aria-invalid="Boolean(fieldProblem('title'))"
              @input="autoGrow"
              @keydown.enter.prevent="descField?.focus()"
            />
            <p v-if="fieldProblem('title')" class="field-error">Title {{ fieldProblem('title') }}</p>
            <textarea
              ref="descField"
              v-model="meta.description"
              data-field="description"
              class="editor-desc"
              rows="1"
              placeholder="A sentence or two for cards, search and link previews"
              aria-label="Description"
              :aria-invalid="Boolean(fieldProblem('description'))"
              @input="autoGrow"
            />
            <p v-if="fieldProblem('description')" class="field-error">Description {{ fieldProblem('description') }}</p>

            <!-- The article's own meta line, each part of it editable in place. The
                 wrapper hides the dot a wrapped line would otherwise start with. -->
            <div class="meta-wrap">
            <div class="meta-line">
              <AdminMenu class="meta-item" label="Section" align="left" button-class="meta-link">
                <template #button>{{ SECTION_META[section].label }}<AdminIcon name="chevron-down" :size="11" /></template>
                <button
                  v-for="value in POST_SECTIONS"
                  :key="value"
                  type="button"
                  role="menuitemradio"
                  :aria-checked="section === value"
                  @click="section = value"
                >
                  {{ SECTION_META[value].label }}
                  <AppIcon v-if="section === value" name="check" :size="15" class="menu-check" />
                </button>
              </AdminMenu>
              <label class="meta-item meta-link meta-date" :class="{ 'is-invalid': fieldProblem('date') }">
                <span>{{ formatDate(meta.date) || 'Date' }}</span>
                <input v-model="meta.date" data-field="date" type="date" aria-label="Date" required @click="openPicker">
              </label>
              <span v-if="meta.updatedAt" class="meta-item meta-updated" :class="{ 'is-invalid': fieldProblem('updatedAt') }">
                <label class="meta-link meta-date">
                  <span>Updated {{ formatDate(meta.updatedAt) || meta.updatedAt }}</span>
                  <input v-model="meta.updatedAt" data-field="updatedAt" type="date" aria-label="Updated" @click="openPicker">
                </label>
                <button type="button" class="meta-x" aria-label="Remove the update date" @click="meta.updatedAt = ''">
                  <AppIcon name="x" :size="11" />
                </button>
              </span>
              <AdminTagInput v-model="meta.tags" :suggestions="tagSuggestions" class="meta-item meta-tags" />
              <span v-if="meta.cover" class="meta-item meta-cover" :class="{ 'is-invalid': fieldProblem('cover') }">
                <img :src="coverThumb" alt="">
                <button type="button" class="meta-link" data-field="cover" @click="coverInput?.click()">Cover</button>
                <button type="button" class="meta-x" aria-label="Remove the cover" @click="meta.cover = ''">
                  <AppIcon name="x" :size="11" />
                </button>
              </span>
              <button v-else type="button" class="meta-item meta-link" data-field="cover" :disabled="coverBusy" @click="coverInput?.click()">
                <span v-if="coverBusy" class="admin-spinner" />
                <template v-else>+ </template>Cover
              </button>
              <label class="meta-item meta-url" :class="{ 'is-invalid': fieldProblem('slug') || (showFieldErrors && !slug) }">
                <span>{{ SECTION_META[section].path }}/</span>
                <input
                  :value="slug"
                  data-field="slug"
                  type="text"
                  placeholder="post-url"
                  aria-label="URL"
                  spellcheck="false"
                  autocapitalize="off"
                  autocomplete="off"
                  :size="Math.max(8, slug.length + 1)"
                  @input="onSlugInput"
                  @blur="tidySlug"
                >
              </label>
            </div>
            </div>
            <p v-for="line in metaProblems" :key="line" class="field-error">{{ line }}</p>

            <div ref="toolbarSentinel" class="toolbar-sentinel" aria-hidden="true" />
            <AdminToolbar ref="toolbar" class="editor-toolbar-sticky" :class="{ 'is-stuck': toolbarStuck }" @command="onCommand" />
            <AdminCodeEditor
              ref="editor"
              v-model="body"
              placeholder="Write in Markdown. Paste or drop images."
              label="Post text"
              @files="addFiles"
              @save="saveShortcut"
            />
          </div>
        </section>

        <section class="editor-preview" aria-label="Preview">
          <AdminPreview :post="preview" :media="media" :device="wideScreen ? device : 'wide'" :theme="theme" />
          <p v-if="previewFailed" class="preview-failed">Preview unavailable. Check the connection.</p>
        </section>
      </div>
    </template>

    <input ref="imageInput" type="file" accept="image/*" multiple hidden @change="addFiles(picked($event))">
    <input ref="fileInput" type="file" multiple hidden @change="addFiles(picked($event))">
    <input ref="coverInput" type="file" accept="image/*" hidden @change="onCoverPicked">

    <AdminImageDialog :open="imageDialog" :items="imageItems" @insert="insertImages" @cancel="cancelImages" @edit="editImage" />

    <AdminDialog :open="Boolean(conflict)" title="Changed elsewhere" @close="conflict = null">
      <p>{{ conflict?.message }} Perhaps on another device. Save this version over it, or cancel and reopen the post to see the other one (this text stays on this device).</p>
      <template #actions>
        <button class="admin-btn is-quiet" type="button" @click="conflict = null">Cancel</button>
        <button class="admin-btn is-primary" type="button" @click="overwrite">Save over it</button>
      </template>
    </AdminDialog>

    <AdminDialog :open="Boolean(renameConfirm)" title="Change the address?" @close="renameConfirm = null">
      <p>This post is live. Moving it to <strong>{{ sitePath }}</strong> breaks links to its old address.</p>
      <template #actions>
        <button class="admin-btn is-quiet" type="button" @click="renameConfirm = null">Cancel</button>
        <button class="admin-btn is-primary" type="button" @click="confirmRename">Move it</button>
      </template>
    </AdminDialog>

    <AdminDialog :open="unpublishConfirm" title="Unpublish?" @close="unpublishConfirm = false">
      <p>The post comes off the site and stays here as a draft.</p>
      <template #actions>
        <button class="admin-btn is-quiet" type="button" @click="unpublishConfirm = false">Cancel</button>
        <button class="admin-btn is-primary" type="button" @click="unpublish">Unpublish</button>
      </template>
    </AdminDialog>

    <AdminDialog :open="deleteConfirm" :title="source ? 'Delete this post?' : 'Discard this post?'" :busy="deleting" @close="deleteConfirm = false">
      <p v-if="source">
        The post and its uploaded files are deleted{{ isPublished ? ' and taken off the site' : '' }}. The repository's history keeps a copy.
      </p>
      <p v-else>It was never saved, so it's gone for good.</p>
      <template #actions>
        <button class="admin-btn is-quiet" type="button" :disabled="deleting" @click="deleteConfirm = false">Cancel</button>
        <button class="admin-btn is-primary is-danger" type="button" :disabled="deleting" @click="source ? remove() : discardNew()">
          <span v-if="deleting" class="admin-spinner" />
          {{ source ? 'Delete' : 'Discard' }}
        </button>
      </template>
    </AdminDialog>
  </div>
</template>
