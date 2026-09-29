import { useState } from '#imports'
import type { AdminSession } from '#shared/admin'
import { ANALYTICS_OPT_OUT_KEY } from '#shared/utils/analytics'
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
      // The owner's own visits to the site are not counted in its statistics.
      if (session.value?.user) {
        try {
          localStorage.setItem(ANALYTICS_OPT_OUT_KEY, '1')
        } catch {
          // Storage blocked: this browser's visits are counted.
        }
      }
    } catch {
      failed.value = true
    }
    return session.value
  }

  return { session, failed, load }
}
