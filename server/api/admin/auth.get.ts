import { createHash, randomBytes } from 'node:crypto'
import { getQuery, getRequestURL, sendRedirect } from 'h3'
import { githubClient } from '../../admin/github'
import { adminConfig, missingSetup, requestToken, useAdminSession } from '../../admin/session'

/**
 * Sign-in with GitHub, both legs: without a `code` it sends the browser to GitHub
 * (with a state and a PKCE challenge kept in the sealed session), and GitHub sends
 * it back here with one. The GitHub App's callback URL must be this route:
 * https://<site>/api/admin/auth.
 */

const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')

/** Only back into the editor: never an address someone else put in the link. */
const editorPath = (value: unknown) =>
  typeof value === 'string' && /^\/admin(?:[/?#]|$)/.test(value) && !value.includes('\\') ? value : '/admin'

const failed = (reason: string) => `/admin?signin=${reason}`

export default defineEventHandler(async (event) => {
  const config = adminConfig(event)
  // The editor page explains what is missing.
  if (config.storage === 'local' || missingSetup(config).length) return sendRedirect(event, '/admin')

  const session = await useAdminSession(event, config)
  const query = getQuery(event)
  const callback = `${getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin}/api/admin/auth`

  if (typeof query.code !== 'string') {
    // Back from GitHub without a code: the owner pressed Cancel.
    if (query.error) return sendRedirect(event, failed('cancelled'))
    const state = randomToken()
    const verifier = randomToken(48)
    await session.update({ oauth: { state, verifier, redirect: editorPath(query.redirect) } })
    const url = new URL('/login/oauth/authorize', config.web)
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callback,
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      allow_signup: 'false'
    }).toString()
    return sendRedirect(event, url.toString())
  }

  const oauth = session.data.oauth
  if (!oauth || query.state !== oauth.state) return sendRedirect(event, failed('expired'))

  const tokens = await requestToken(config, {
    code: query.code,
    redirect_uri: callback,
    code_verifier: oauth.verifier
  }).catch(() => null)
  if (!tokens) return sendRedirect(event, failed('failed'))

  const user = await githubClient(config.api, tokens.token)<{ login: string, name: string | null, avatar_url: string }>(
    '/user'
  ).catch(() => null)
  if (!user) return sendRedirect(event, failed('failed'))

  if (user.login.toLowerCase() !== config.login) {
    await session.clear()
    return sendRedirect(event, failed('not-allowed'))
  }

  await session.update({ oauth: undefined, login: user.login, name: user.name ?? undefined, avatar: user.avatar_url, ...tokens })
  return sendRedirect(event, oauth.redirect)
})
