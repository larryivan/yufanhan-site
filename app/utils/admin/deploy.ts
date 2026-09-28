import { ref } from 'vue'
import type { DeployState } from '#shared/admin'
import { adminApi } from './api'
import { toast } from './toast'

/**
 * After a save that changes the live site: says so, then asks now and then
 * whether the commit is live yet, for up to ten minutes. Shared by the post list
 * (publish and unpublish from a row) and the editor.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const useDeploy = () => {
  /** The commit being built, while it is. */
  const building = ref<string | null>(null)

  const follow = async (commit: string, options: { draft: boolean, href: string, local: boolean }) => {
    const live = { href: options.href, label: 'View' }
    if (options.local) {
      // The dev server shows the change at once.
      toast(options.draft ? 'Saved as a draft' : 'Published', options.draft ? {} : { link: live })
      return
    }
    building.value = commit
    toast(options.draft ? 'Unpublished. Updating the site…' : 'Published. The site is building…')
    const started = Date.now()
    while (building.value === commit && Date.now() - started < 10 * 60_000) {
      await sleep(Date.now() - started < 60_000 ? 5000 : 10_000)
      const state: DeployState | null = await adminApi
        .deploy(commit)
        .then((result) => result.state)
        .catch(() => null)
      if (building.value !== commit || !state || state === 'building') continue
      if (state === 'live') toast(options.draft ? 'Taken off the site' : 'Live on the site', options.draft ? {} : { link: live })
      else if (state === 'failed') toast('The site build failed. Check the deployment on Vercel.', { tone: 'error', timeout: 0 })
      else toast('Saved. The site updates with its next deploy.')
      break
    }
    if (building.value === commit) building.value = null
  }

  return { building, follow }
}
