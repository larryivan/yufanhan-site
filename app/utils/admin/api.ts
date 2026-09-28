import { FetchError } from 'ofetch'
import { ref } from 'vue'
import type {
  AdminSession,
  DeployState,
  EditorPost,
  PostMeta,
  PostSummary,
  PreviewResult,
  Problem,
  SaveResult
} from '#shared/admin'
import type { PostSection } from '#shared/utils/sections'

/** The editor's server routes (server/api/admin), with their errors made readable. */

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** `changed`, `deleted`, `exists` for a save that conflicts. */
    readonly code?: string,
    readonly problems: Problem[] = []
  ) {
    super(message)
  }
}

/** Set when the server says the sign-in is gone; the editor then offers to sign in again. */
export const signedOut = ref(false)

const toAdminError = (error: unknown) => {
  if (error instanceof AdminError) return error
  if (error instanceof FetchError) {
    if (error.name === 'AbortError' || error.cause instanceof DOMException) return error
    const data = error.data as { message?: string, data?: { code?: string, problems?: Problem[] } } | undefined
    const status = error.statusCode ?? 0
    const message =
      data?.message ||
      (status ? `The server answered ${status}.` : "Can't reach the server. Check the connection and try again.")
    return new AdminError(message, status, data?.data?.code, data?.data?.problems)
  }
  return error
}

let checking: Promise<AdminSession> | null = null

export const fetchSession = () => $fetch<AdminSession>('/api/admin/session', { retry: 0 })

/**
 * A request, retried once when it failed as signed out but the session is fine:
 * two requests refreshing an expiring token at once, one of them loses.
 */
const request = async <T>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> => {
  const run = () => $fetch<T>(url, { retry: 0, ...options } as Parameters<typeof $fetch>[1]) as Promise<T>
  try {
    return await run()
  } catch (error) {
    const failure = toAdminError(error)
    if (!(failure instanceof AdminError) || failure.status !== 401) throw failure
    checking ||= fetchSession().finally(() => (checking = null))
    const session = await checking.catch(() => null)
    if (!session?.user) {
      signedOut.value = true
      throw failure
    }
    try {
      return await run()
    } catch (retryError) {
      const retryFailure = toAdminError(retryError)
      if (retryFailure instanceof AdminError && retryFailure.status === 401) signedOut.value = true
      throw retryFailure
    }
  }
}

export interface PostInput {
  section: PostSection
  slug: string
  meta: PostMeta
  body: string
}

export const adminApi = {
  posts: () => request<{ posts: PostSummary[] }>('/api/admin/posts'),
  post: (path: string) => request<EditorPost>('/api/admin/post', { query: { path } }),
  preview: (input: PostInput, signal?: AbortSignal) =>
    request<PreviewResult>('/api/admin/preview', { method: 'POST', body: input, signal }),
  upload: (blob: Blob) =>
    request<{ sha: string, size: number }>('/api/admin/upload', {
      method: 'POST',
      body: blob,
      headers: { 'content-type': 'application/octet-stream' }
    }),
  save: (
    input: PostInput & { source?: { path: string, sha: string }, uploads: { path: string, sha: string }[], force?: boolean }
  ) => request<SaveResult>('/api/admin/save', { method: 'POST', body: input }),
  remove: (path: string, sha: string) =>
    request<{ commit: string, deploy: boolean }>('/api/admin/delete', { method: 'POST', body: { path, sha } }),
  deploy: (commit: string) => request<{ state: DeployState }>('/api/admin/deploy', { query: { commit } }),
  logout: () => $fetch('/api/admin/logout', { method: 'POST', retry: 0 })
}

/** Where sign-in starts, coming back to `path` afterwards. */
export const signInUrl = (path: string) => `/api/admin/auth?redirect=${encodeURIComponent(path)}`

export const isAbort = (error: unknown) =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof FetchError && (error.name === 'AbortError' || error.cause instanceof DOMException))
