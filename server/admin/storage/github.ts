import { createError } from 'h3'
import type { DeployState } from '#shared/admin'
import { POST_SECTIONS } from '#shared/utils/sections'
import { encodePath, githubClient, githubError, statusOf } from '../github'
import { isManagedPath } from '../post-file'
import type { Change, CommitPlan, PostSource, RepoFile, Snapshot, Storage } from './types'

/**
 * The repository on GitHub, through the API as the signed-in user: what the
 * deployed editor reads and commits to. A save is one commit made with the Git
 * Data API (blobs, a tree, a commit, then the branch moves to it), so a post and
 * its images land together or not at all.
 */

export interface GitHubRepoOptions {
  api: string
  token: string
  repo: { owner: string, name: string }
  branch: string
  /** The commit the running deployment was built from (VERCEL_GIT_COMMIT_SHA). */
  deployedCommit: string
}

interface TreeEntry {
  path: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
}

interface ContentFile {
  type: string
  sha: string
  size: number
  content?: string
  encoding?: string
}

interface GraphQLTree {
  entries?: { name: string, type: string, oid: string, object?: { text?: string | null } | null }[]
}

const toTreeEntry = (change: Change) => {
  const entry = { path: change.path, mode: '100644', type: 'blob' }
  if (change.type === 'text') return { ...entry, content: change.text }
  if (change.type === 'blob') return { ...entry, sha: change.sha }
  // Deleting a file is a tree entry without a blob.
  return { ...entry, sha: null }
}

/** How often a save is retried when someone else moved the branch in the meantime. */
const COMMIT_ATTEMPTS = 3

export const githubRepo = ({ api, token, repo, branch, deployedCommit }: GitHubRepoOptions): Storage => {
  const gh = githubClient(api, token)
  const base = `/repos/${repo.owner}/${repo.name}`
  const repoName = `${repo.owner}/${repo.name}`

  const request = async <T>(what: string, run: () => Promise<T>) => {
    try {
      return await run()
    } catch (error) {
      throw githubError(error, what)
    }
  }

  const bytesOf = async (url: string, what: string) => {
    try {
      const buffer = await gh<ArrayBuffer>(url, {
        headers: { accept: 'application/vnd.github.raw+json' },
        responseType: 'arrayBuffer'
      })
      return new Uint8Array(buffer)
    } catch (error) {
      if (statusOf(error) === 404) return null
      throw githubError(error, what)
    }
  }

  const snapshotAt = async (treeSha: string): Promise<Snapshot> => {
    const tree = await request(repoName, () =>
      gh<{ tree: TreeEntry[], truncated: boolean }>(`${base}/git/trees/${treeSha}`, { query: { recursive: '1' } })
    )
    if (tree.truncated) {
      throw createError({ statusCode: 500, message: `${repoName} has too many files for GitHub to list at once.` })
    }
    const files = new Map<string, RepoFile>()
    for (const entry of tree.tree) {
      if (entry.type === 'blob' && isManagedPath(entry.path)) {
        files.set(entry.path, { path: entry.path, sha: entry.sha, size: entry.size ?? 0 })
      }
    }
    return { files }
  }

  return {
    kind: 'github',

    // One GraphQL query returns every post's text, where REST would take a
    // request per file.
    async listPosts() {
      const variables: Record<string, string> = { owner: repo.owner, name: repo.name }
      for (const section of POST_SECTIONS) variables[section] = `${branch}:content/${section}`
      const query = `query(${['$owner', '$name', ...POST_SECTIONS.map((section) => `$${section}`)].map((name) => `${name}: String!`).join(', ')}) {
  repository(owner: $owner, name: $name) {
    ${POST_SECTIONS.map((section) => `${section}: object(expression: $${section}) { ...posts }`).join('\n    ')}
  }
}
fragment posts on Tree { entries { name type oid object { ... on Blob { text } } } }`

      const result = await request(repoName, () =>
        gh<{ data?: { repository: Record<string, GraphQLTree | null> | null }, errors?: { message: string }[] }>(
          '/graphql',
          { method: 'POST', body: { query, variables } }
        )
      )
      if (result.errors?.length || !result.data?.repository) {
        const detail = result.errors?.map((error) => error.message).join('; ') || 'repository not found'
        throw createError({ statusCode: 404, message: `Can't list the posts in ${repoName} (${detail}).` })
      }
      const repository = result.data.repository
      return POST_SECTIONS.flatMap((section) =>
        (repository[section]?.entries ?? [])
          .filter((entry) => entry.type === 'blob' && /^[^_.].*\.md$/.test(entry.name) && typeof entry.object?.text === 'string')
          .map((entry): PostSource => ({ path: `content/${section}/${entry.name}`, sha: entry.oid, text: entry.object!.text! }))
      )
    },

    async readPost(path) {
      let file: ContentFile
      try {
        file = await gh<ContentFile>(`${base}/contents/${encodePath(path)}`, { query: { ref: branch } })
      } catch (error) {
        if (statusOf(error) === 404) return null
        throw githubError(error, path)
      }
      if (file.type !== 'file') return null
      // Files over 1 MB come without their content.
      const bytes =
        file.encoding === 'base64' && file.content
          ? Buffer.from(file.content, 'base64')
          : await bytesOf(`${base}/git/blobs/${file.sha}`, path)
      return bytes ? { path, sha: file.sha, text: Buffer.from(bytes).toString('utf8') } : null
    },

    async putBlob(bytes) {
      const blob = await request('the upload', () =>
        gh<{ sha: string }>(`${base}/git/blobs`, {
          method: 'POST',
          body: { content: Buffer.from(bytes).toString('base64'), encoding: 'base64' }
        })
      )
      return blob.sha
    },

    async readFile(ref) {
      if ('sha' in ref) {
        return /^[0-9a-f]{40}$/.test(ref.sha) ? bytesOf(`${base}/git/blobs/${ref.sha}`, 'the file') : null
      }
      return bytesOf(`${base}/contents/${encodePath(ref.path)}?ref=${encodeURIComponent(branch)}`, ref.path)
    },

    async commit(plan: (snapshot: Snapshot) => CommitPlan | Promise<CommitPlan>) {
      for (let attempt = 1; ; attempt++) {
        const ref = await request(`the ${branch} branch`, () =>
          gh<{ object: { sha: string } }>(`${base}/git/ref/heads/${encodePath(branch)}`)
        )
        const head = ref.object.sha
        const headCommit = await request(repoName, () => gh<{ tree: { sha: string } }>(`${base}/git/commits/${head}`))
        const { message, changes } = await plan(await snapshotAt(headCommit.tree.sha))
        if (!changes.length) return { commit: head }

        const tree = await request(repoName, () =>
          gh<{ sha: string }>(`${base}/git/trees`, {
            method: 'POST',
            body: { base_tree: headCommit.tree.sha, tree: changes.map(toTreeEntry) }
          })
        )
        const commit = await request(repoName, () =>
          gh<{ sha: string }>(`${base}/git/commits`, { method: 'POST', body: { message, tree: tree.sha, parents: [head] } })
        )
        try {
          await gh(`${base}/git/refs/heads/${encodePath(branch)}`, { method: 'PATCH', body: { sha: commit.sha, force: false } })
          return { commit: commit.sha }
        } catch (error) {
          // Not a fast-forward: the branch moved after it was read. Plan again on top of it.
          if (statusOf(error) === 422 && attempt < COMMIT_ATTEMPTS) continue
          throw githubError(error, `the ${branch} branch`)
        }
      }
    },

    async deployState(commit): Promise<DeployState> {
      if (!/^[0-9a-f]{40}$/.test(commit)) return 'unknown'
      // Outside Vercel nothing says which commit is live.
      if (!deployedCommit) return 'unknown'
      if (deployedCommit === commit) return 'live'
      try {
        // Live as part of a later deployment (two saves in a row build once).
        const compare = await gh<{ status: string }>(`${base}/compare/${commit}...${deployedCommit}`)
        if (compare.status === 'ahead' || compare.status === 'identical') return 'live'
      } catch {
        // The deployed commit may be unknown to GitHub (a CLI deploy): fall through.
      }
      try {
        // Vercel reports each build as a commit status. Reading it needs the App's
        // "Commit statuses: Read-only" permission; without it a build is only
        // ever "building" until it goes live.
        const status = await gh<{ statuses: { context: string, state: string }[] }>(`${base}/commits/${commit}/status`)
        const vercel = status.statuses.filter((entry) => /vercel/i.test(entry.context))
        if (vercel.some((entry) => entry.state === 'failure' || entry.state === 'error')) return 'failed'
      } catch {
        // No permission: see above.
      }
      return 'building'
    }
  }
}
