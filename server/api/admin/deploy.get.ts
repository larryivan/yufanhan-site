import { getQuery } from 'h3'
import type { DeployState } from '#shared/admin'
import { requireAdmin } from '../../admin/session'

/** Whether a saved commit is on the live site yet: polled after publishing. */
export default defineEventHandler(async (event): Promise<{ state: DeployState }> => {
  const { storage } = await requireAdmin(event)
  return { state: await storage.deployState(String(getQuery(event).commit ?? '')) }
})
