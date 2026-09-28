import type { DeployState } from '#shared/admin'

/**
 * Where the editor reads and writes posts. `github` commits to the repository
 * through the GitHub API (the deployed site); `local` reads and writes this
 * checkout's files (`npm run dev` only, for trying the editor out).
 */

export interface RepoFile {
  /** From the repository root: content/blog/my-post.md */
  path: string
  /** Git blob SHA of the content. */
  sha: string
  size: number
}

export interface PostSource {
  path: string
  sha: string
  text: string
}

/** Every file under the editor's paths (see isManagedPath) at one commit. */
export interface Snapshot {
  files: Map<string, RepoFile>
}

export type Change =
  | { type: 'text', path: string, text: string }
  /** A blob already stored: an upload (putBlob), or a file that moves. */
  | { type: 'blob', path: string, sha: string }
  | { type: 'delete', path: string }

export interface CommitPlan {
  message: string
  changes: Change[]
}

export interface Storage {
  kind: 'local' | 'github'
  /** Every post's file, drafts included. */
  listPosts(): Promise<PostSource[]>
  readPost(path: string): Promise<PostSource | null>
  /** Stores bytes for a later commit and returns their SHA. */
  putBlob(bytes: Uint8Array): Promise<string>
  readFile(ref: { path: string } | { sha: string }): Promise<Uint8Array | null>
  /**
   * Commits the changes `plan` returns for the current files, all at once. `plan`
   * runs again on newer files if the branch moved in the meantime, so the checks
   * it makes (has the post changed since it was opened?) are never stale.
   */
  commit(plan: (snapshot: Snapshot) => CommitPlan | Promise<CommitPlan>): Promise<{ commit: string }>
  /** Whether a commit is on the live site yet. */
  deployState(commit: string): Promise<DeployState>
}
