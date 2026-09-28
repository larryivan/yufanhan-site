import type { MediaKind, PostMeta } from '#shared/admin'
import type { PostSection } from '#shared/utils/sections'

/**
 * Unsaved work kept on this device (localStorage) while the editor is open, so a
 * closed tab, a dead battery or an expired sign-in loses nothing. Cleared once
 * the post is saved.
 */

const PREFIX = 'yufanhan-editor:'

/** A file uploaded for a post that is not committed yet. */
export interface PendingUpload {
  /** Repository path: public/images/<slug>/<name> */
  path: string
  sha: string
  kind: MediaKind
  name: string
  type: string
}

export interface EditorSnapshot {
  section: PostSection
  slug: string
  /** Whether the slug was typed rather than taken from the title. */
  slugTouched: boolean
  meta: PostMeta
  body: string
  uploads: PendingUpload[]
}

export interface Autosave {
  savedAt: number
  /** The version the changes were made on, for an existing post. */
  base?: { path: string, sha: string }
  snapshot: EditorSnapshot
}

export const autosaveKey = (target: { path?: string, draft?: string }) =>
  target.path ? `${PREFIX}post:${target.path}` : `${PREFIX}new:${target.draft}`

// Storage throws when the browser blocks site data: the editor then just works
// without it.
export const readAutosave = (key: string): Autosave | null => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? 'null') as Autosave | null
    return value?.snapshot ? value : null
  } catch {
    return null
  }
}

export const writeAutosave = (key: string, value: Autosave) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Full or blocked.
  }
}

export const clearAutosave = (key: string) => {
  try {
    localStorage.removeItem(key)
  } catch {
    // Blocked.
  }
}

export const timeAgo = (time: number) => {
  const minutes = Math.round((Date.now() - time) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface UnsavedDraft {
  id: string
  title: string
  when: string
}

/** New posts started on this device and never saved, newest first. */
export const listUnsaved = (): UnsavedDraft[] => {
  try {
    const found: (UnsavedDraft & { savedAt: number })[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(`${PREFIX}new:`)) continue
      const saved = readAutosave(key)
      if (!saved) continue
      found.push({
        id: key.slice(`${PREFIX}new:`.length),
        title: saved.snapshot.meta.title.trim(),
        when: timeAgo(saved.savedAt),
        savedAt: saved.savedAt
      })
    }
    return found.sort((a, b) => b.savedAt - a.savedAt).map(({ savedAt: _, ...draft }) => draft)
  } catch {
    return []
  }
}
