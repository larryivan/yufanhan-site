import { createError } from 'h3'
import { FetchError } from 'ofetch'

/** A client for GitHub's REST and GraphQL APIs, authenticated as the signed-in user. */
export const githubClient = (api: string, token: string) =>
  $fetch.create({
    baseURL: api,
    retry: 0,
    timeout: 20_000,
    headers: {
      'authorization': `Bearer ${token}`,
      'accept': 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'yufanhan-editor'
    }
  })

export type GitHubClient = ReturnType<typeof githubClient>

export const statusOf = (error: unknown) => (error instanceof FetchError ? error.statusCode : undefined)

/**
 * A failed GitHub request as the error the editor shows: what went wrong and what
 * to do about it, with GitHub's own words when it gave any.
 */
export const githubError = (error: unknown, what: string) => {
  if (!(error instanceof FetchError)) return error
  const status = error.statusCode
  const detail = typeof error.data?.message === 'string' ? ` (GitHub: ${error.data.message})` : ''
  if (status === 401) {
    return createError({ statusCode: 401, message: 'Your GitHub sign-in has expired. Sign in again.' })
  }
  if (status === 403 || status === 404) {
    return createError({
      statusCode: status,
      message: `Can't reach ${what}${detail}. Check that the editor's GitHub App is installed on the repository with Contents: Read and write.`
    })
  }
  if (status === 409 || status === 422) {
    return createError({ statusCode: 409, message: `GitHub refused the change to ${what}${detail}.` })
  }
  return createError({ statusCode: 502, message: `GitHub didn't answer for ${what}${detail}. Try again in a moment.` })
}

/** A repository path in a URL: each segment escaped, the slashes kept. */
export const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/')
