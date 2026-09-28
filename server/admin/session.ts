import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { H3Event } from 'h3'
import { createError, getRequestHeader, getRequestHost, useSession } from 'h3'
import type { AdminSession } from '#shared/admin'
import type { Storage } from './storage/types'
import { githubRepo } from './storage/github'

/**
 * Who may use the editor, and where it saves.
 *
 * Online, the owner signs in with GitHub through a GitHub App installed on this
 * repository only. The sign-in hands back a token that can do what both the App
 * and the owner can do: read and write this repository's files. It stays on the
 * server, sealed in an encrypted, HTTP-only cookie that is only ever sent to
 * /api/admin. `npm run dev` skips all of it and saves to the local files.
 */

export interface SessionData {
  login?: string
  name?: string
  avatar?: string
  token?: string
  refreshToken?: string
  /** When the token expires (ms since epoch), if the App issues expiring tokens. */
  expiresAt?: number
  refreshExpiresAt?: number
  /** Between the redirect to GitHub and the way back. */
  oauth?: { state: string, verifier: string, redirect: string }
}

const DAY = 86_400

// With no password set, `npm run dev` seals sessions with a key kept in .data/
// (ignored by git), so they survive the server reloading as its code changes.
let devSecret = ''
const devPassword = () => {
  if (!import.meta.dev) return ''
  if (devSecret) return devSecret
  const file = join(process.cwd(), '.data', 'admin-dev-secret')
  try {
    devSecret = readFileSync(file, 'utf8').trim()
  } catch {
    devSecret = randomBytes(32).toString('base64url')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, devSecret)
  }
  return devSecret
}

export const adminConfig = (event: H3Event) => {
  const admin = useRuntimeConfig(event).admin
  const [owner = '', name = ''] = String(admin.repo || '').split('/')
  const password = String(admin.sessionPassword || '')
  return {
    storage: import.meta.dev && admin.storage !== 'github' ? ('local' as const) : ('github' as const),
    clientId: String(admin.githubClientId || ''),
    clientSecret: String(admin.githubClientSecret || ''),
    repo: owner && name ? { owner, name } : null,
    branch: String(admin.branch || 'main'),
    // The one account allowed in: the repository's owner unless set.
    login: String(admin.login || owner).toLowerCase(),
    deployedCommit: String(admin.deployedCommit || ''),
    sessionPassword: password.length >= 32 ? password : devPassword(),
    // Tests point these at a stand-in for GitHub; a production build always uses GitHub.
    api: (import.meta.dev && String(admin.githubApi || '')) || 'https://api.github.com',
    web: (import.meta.dev && String(admin.githubWeb || '')) || 'https://github.com'
  }
}

export type AdminConfig = ReturnType<typeof adminConfig>

/** The environment variables still missing before signing in can work. */
export const missingSetup = (config: AdminConfig) => {
  if (config.storage === 'local') return []
  const missing: string[] = []
  // All digits is the App ID, listed just above the Client ID on the App's
  // page; GitHub answers a sign-in with it with a 404.
  if (!config.clientId || /^\d+$/.test(config.clientId)) missing.push('NUXT_ADMIN_GITHUB_CLIENT_ID')
  if (!config.clientSecret) missing.push('NUXT_ADMIN_GITHUB_CLIENT_SECRET')
  if (!config.repo) missing.push('NUXT_ADMIN_REPO')
  if (!config.sessionPassword) missing.push('NUXT_ADMIN_SESSION_PASSWORD')
  return missing
}

export const useAdminSession = (event: H3Event, config = adminConfig(event)) =>
  useSession<SessionData>(event, {
    name: 'yufanhan-admin',
    password: config.sessionPassword,
    maxAge: 90 * DAY,
    // Only the cookie carries it, never a request header.
    sessionHeader: false,
    cookie: { path: '/api/admin', httpOnly: true, secure: !import.meta.dev, sameSite: 'lax' }
  })

/**
 * Changes must come from the editor's own pages. The cookie is SameSite=Lax, which
 * already keeps it off other sites' requests; this also refuses them outright.
 */
export const assertSameOrigin = (event: H3Event) => {
  if (event.method === 'GET' || event.method === 'HEAD') return
  const site = getRequestHeader(event, 'sec-fetch-site')
  if (site) {
    if (site === 'same-origin') return
  } else {
    const origin = getRequestHeader(event, 'origin')
    try {
      if (origin && new URL(origin).host === getRequestHost(event, { xForwardedHost: true })) return
    } catch {
      // A malformed Origin header.
    }
  }
  throw createError({ statusCode: 403, message: 'Requests must come from the editor.' })
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
  error?: string
  error_description?: string
}

/** Exchanges an authorization code or a refresh token for a user access token. */
export const requestToken = async (config: AdminConfig, grant: Record<string, string>) => {
  const response = await $fetch<TokenResponse>(`${config.web}/login/oauth/access_token`, {
    method: 'POST',
    headers: { accept: 'application/json' },
    body: { client_id: config.clientId, client_secret: config.clientSecret, ...grant },
    retry: 0,
    timeout: 20_000
  })
  if (!response.access_token) return null
  const now = Date.now()
  return {
    token: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: response.expires_in ? now + response.expires_in * 1000 : undefined,
    refreshExpiresAt: response.refresh_token_expires_in ? now + response.refresh_token_expires_in * 1000 : undefined
  } satisfies Partial<SessionData>
}

const signedIn = (data: SessionData, config: AdminConfig) =>
  Boolean(data.token && data.login && data.login.toLowerCase() === config.login) &&
  !(data.refreshExpiresAt && data.refreshExpiresAt < Date.now()) &&
  !(data.expiresAt && !data.refreshToken && data.expiresAt < Date.now())

/** What the editor's pages need to know before anything else. */
export const describeSession = async (event: H3Event): Promise<AdminSession> => {
  const config = adminConfig(event)
  if (config.storage === 'local') return { storage: 'local', user: { login: 'local' }, setup: [] }
  const setup = missingSetup(config)
  const repo = config.repo ? `${config.repo.owner}/${config.repo.name}` : undefined
  if (setup.length) return { storage: 'github', user: null, repo, setup }
  const { data } = await useAdminSession(event, config)
  const user = signedIn(data, config) ? { login: data.login!, name: data.name, avatar: data.avatar } : null
  return { storage: 'github', user, repo, setup }
}

/**
 * The signed-in owner's storage, for every /api/admin route but sign-in. Throws
 * 401 otherwise. A token about to expire is refreshed on the way.
 */
export const requireAdmin = async (event: H3Event): Promise<{ login: string, storage: Storage }> => {
  assertSameOrigin(event)
  const config = adminConfig(event)
  if (import.meta.dev && config.storage === 'local') {
    const { localFiles } = await import('./storage/local')
    return { login: 'local', storage: localFiles() }
  }
  const missing = missingSetup(config)
  if (missing.length || !config.repo) {
    throw createError({ statusCode: 503, message: `The editor isn't set up yet. Set ${missing.join(', ')}.` })
  }

  const session = await useAdminSession(event, config)
  let data = session.data
  if (!signedIn(data, config)) throw createError({ statusCode: 401, message: 'Sign in with GitHub to continue.' })

  if (data.expiresAt && data.expiresAt - 5 * 60_000 < Date.now()) {
    // A refresh token works once. Two requests refreshing at the same moment:
    // the loser fails here without clearing the session, and the editor retries
    // with the cookie the winner set.
    const tokens = await requestToken(config, { grant_type: 'refresh_token', refresh_token: data.refreshToken! }).catch(
      () => null
    )
    if (!tokens) throw createError({ statusCode: 401, message: 'Your GitHub sign-in has expired. Sign in again.' })
    await session.update(tokens)
    data = session.data
  }

  return {
    login: data.login!,
    storage: githubRepo({
      api: config.api,
      token: data.token!,
      repo: config.repo,
      branch: config.branch,
      deployedCommit: config.deployedCommit
    })
  }
}
