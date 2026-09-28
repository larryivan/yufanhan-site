import { access, copyFile, mkdir, readdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, relative, sep } from 'node:path'
import { POST_SECTIONS } from '#shared/utils/sections'
import { gitBlobSha, isManagedPath } from '../post-file'
import type { CommitPlan, PostSource, RepoFile, Snapshot, Storage } from './types'

/**
 * This checkout's own files, for `npm run dev`: Save writes into content/ and
 * public/, where the dev server picks the change up at once. Nothing is
 * committed; that stays with git. Uploads wait in .data/ (ignored by git) until
 * a save moves them into public/.
 */

const root = process.cwd()
const uploads = join(root, '.data', 'admin-uploads')

/** A repository path as a path on disk, never outside the checkout. */
const onDisk = (path: string) => {
  const full = normalize(join(root, path))
  if (relative(root, full).startsWith('..') || !isManagedPath(path)) throw new Error(`Not an editor path: ${path}`)
  return full
}

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException)?.code === 'ENOENT'

const exists = (file: string) => access(file).then(() => true, () => false)

const readOrNull = async (file: string) => {
  try {
    return await readFile(file)
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

/** Files under `dir` (a repository path), `depth` levels down. */
const listTree = async (dir: string, depth: number): Promise<RepoFile[]> => {
  let entries
  try {
    entries = await readdir(join(root, dir), { withFileTypes: true })
  } catch (error) {
    if (isMissing(error)) return []
    throw error
  }
  const found = await Promise.all(
    entries.map(async (entry): Promise<RepoFile[]> => {
      if (entry.name.startsWith('.')) return []
      const path = `${dir}/${entry.name}`
      if (entry.isDirectory()) return depth > 1 ? listTree(path, depth - 1) : []
      if (!entry.isFile()) return []
      const bytes = await readFile(join(root, path))
      return [{ path, sha: gitBlobSha(bytes), size: bytes.byteLength }]
    })
  )
  return found.flat()
}

const snapshot = async (): Promise<Snapshot> => {
  const lists = await Promise.all([
    ...POST_SECTIONS.map((section) => listTree(`content/${section}`, 1)),
    listTree('public/images', 2),
    listTree('public/files', 2)
  ])
  return { files: new Map(lists.flat().map((file) => [file.path, file])) }
}

/** Removes directories left empty by a delete, up to the section or media root. */
const pruneEmpty = async (file: string) => {
  let dir = dirname(file)
  const stop = new Set(['content', 'public/images', 'public/files'].map((path) => join(root, path)))
  while (!stop.has(dir) && dir.startsWith(root + sep)) {
    try {
      await rmdir(dir)
    } catch {
      return
    }
    dir = dirname(dir)
  }
}

export const localFiles = (): Storage => ({
  kind: 'local',

  async listPosts() {
    const files = (await Promise.all(POST_SECTIONS.map((section) => listTree(`content/${section}`, 1)))).flat()
    const posts = await Promise.all(
      files
        .filter((file) => /\/[^_.][^/]*\.md$/.test(file.path))
        .map(async (file): Promise<PostSource> => ({
          ...file,
          text: await readFile(join(root, file.path), 'utf8')
        }))
    )
    return posts
  },

  async readPost(path) {
    const bytes = await readOrNull(onDisk(path))
    return bytes ? { path, sha: gitBlobSha(bytes), text: bytes.toString('utf8') } : null
  },

  async putBlob(bytes) {
    const sha = gitBlobSha(bytes)
    await mkdir(uploads, { recursive: true })
    await writeFile(join(uploads, sha), bytes)
    return sha
  },

  async readFile(ref) {
    if ('path' in ref) return readOrNull(onDisk(ref.path))
    if (!/^[0-9a-f]{40}$/.test(ref.sha)) return null
    const upload = await readOrNull(join(uploads, ref.sha))
    if (upload) return upload
    const file = [...(await snapshot()).files.values()].find((entry) => entry.sha === ref.sha)
    return file ? readOrNull(join(root, file.path)) : null
  },

  async commit(plan: (snapshot: Snapshot) => CommitPlan | Promise<CommitPlan>) {
    const current = await snapshot()
    const { changes } = await plan(current)
    const bySha = new Map([...current.files.values()].map((file) => [file.sha, file.path]))

    // Copies first: a file that moves is deleted from its old path below.
    for (const change of changes) {
      if (change.type === 'delete') continue
      const target = onDisk(change.path)
      await mkdir(dirname(target), { recursive: true })
      if (change.type === 'text') {
        await writeFile(target, change.text)
        continue
      }
      const upload = join(uploads, change.sha)
      const moved = bySha.get(change.sha)
      const source = (await exists(upload)) ? upload : moved ? join(root, moved) : null
      if (!source) throw new Error(`Upload ${change.sha} is missing: add the file again`)
      if (source !== target) await copyFile(source, target)
    }
    for (const change of changes) {
      if (change.type !== 'delete') continue
      const target = onDisk(change.path)
      await rm(target, { force: true })
      await pruneEmpty(target)
    }
    return { commit: `local-${Date.now()}` }
  },

  async deployState() {
    // The dev server reloads content as soon as the files change.
    return 'live'
  }
})
