import type { BundledLanguage } from 'shiki'

/**
 * Markdown options shared by nuxt.config.ts (the @nuxt/content parser),
 * content.validation.ts (the formula check) and server/admin/render.ts (the
 * editor's preview), so a formula that passes the check renders the same way on
 * the page, and the preview is the page.
 */

/** The headings listed in "On this page": h2 and h3. */
export const MARKDOWN_TOC = { depth: 3, searchDepth: 3 }

/** Code colours: one theme per site theme, switched by CSS variables. */
export const CODE_THEMES = { default: 'github-light', dark: 'github-dark' }

/**
 * Shorthands available in every formula. `\Ne` is the effective population size
 * written the usual way, with an upright subscript e.
 */
export const KATEX_MACROS: Record<string, string> = {
  '\\Ne': 'N_\\mathrm{e}',
  '\\E': '\\mathbb{E}',
  '\\Var': '\\operatorname{Var}',
  '\\Cov': '\\operatorname{Cov}',
  '\\argmin': '\\operatorname*{arg\\,min}',
  '\\argmax': '\\operatorname*{arg\\,max}'
}

/**
 * `strict: false` keeps KaTeX quiet about things it renders fine anyway, such as
 * Chinese inside `\text{}`. A formula that cannot render at all is still an
 * error: the build check reports it with its file and line.
 */
export const KATEX_OPTIONS = {
  macros: KATEX_MACROS,
  strict: false
} as const

/**
 * Code-block languages. A fence in any other language renders as plain,
 * uncoloured text. Aliases are listed as well: the highlighter looks a fence's
 * language up by file name, so ```py only works if `py` is here too.
 *
 * The first row is what @nuxt/content always adds at build time. It is listed
 * anyway because the editor's preview highlights with the highlighter
 * @nuxtjs/mdc builds from this list alone, and must know the same languages.
 */
export const CODE_LANGS: BundledLanguage[] = [
  'bash', 'html', 'mdc', 'vue', 'yml', 'scss', 'ts', 'typescript',
  'python', 'py',
  'rust', 'rs',
  'r',
  'c', 'cpp',
  'javascript', 'js',
  'json', 'jsonc',
  'toml', 'yaml',
  'sql',
  'shellscript', 'sh', 'shell', 'zsh', 'console', 'shellsession',
  'nextflow', 'groovy',
  'dockerfile', 'makefile',
  'diff', 'latex', 'css'
]
