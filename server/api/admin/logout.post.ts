import { assertSameOrigin, useAdminSession } from '../../admin/session'

export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const session = await useAdminSession(event)
  await session.clear()
  return { ok: true }
})
