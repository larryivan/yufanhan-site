import { useState } from '#imports'
import type { AdminSession } from '#shared/admin'
import { fetchSession } from './api'

/** Who is signed in, fetched once per visit and shared by the editor's pages. */
export const useAdminSession = () => {
  const session = useState<AdminSession | null>('admin-session', () => null)
  const failed = useState('admin-session-failed', () => false)

  const load = async (force = false) => {
    if (session.value && !force) return session.value
    try {
      session.value = await fetchSession()
      failed.value = false
    } catch {
      failed.value = true
    }
    return session.value
  }

  return { session, failed, load }
}
