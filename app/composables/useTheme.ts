import { onMounted, onUnmounted } from 'vue'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

// Storage access throws when the visitor blocks site data. That must never take
// the page down (an error during hydration swaps it for the 500 screen): the
// theme still works, it is just not remembered.
const readStoredTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

const storeTheme = (value: Theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Blocked storage: the choice lasts until the next full page load.
  }
}

export const useTheme = () => {
  // Unknown until mounted: the server cannot see a stored choice or the OS scheme.
  const theme = useState<Theme | null>('theme', () => null)
  // Set by the toggle. Until then the page follows the OS scheme, including a
  // switch made while it is open, and nothing is stored: persisting the OS value
  // on the first visit used to pin it for good.
  const isChosen = useState('theme-chosen', () => false)

  const apply = (value: Theme) => {
    theme.value = value
    document.documentElement.dataset.theme = value
    document.documentElement.classList.toggle('dark', value === 'dark')
  }

  const toggle = () => {
    const next = theme.value === 'dark' ? 'light' : 'dark'
    isChosen.value = true
    apply(next)
    storeTheme(next)
  }

  const followSystem = (event: MediaQueryListEvent) => {
    if (!isChosen.value) apply(event.matches ? 'dark' : 'light')
  }

  let systemQuery: MediaQueryList | null = null

  // The inline head script's resolution, applied again: it also covers a page where
  // that script bailed out before setting `data-theme`.
  onMounted(() => {
    const chosen = readStoredTheme() ?? (isChosen.value ? theme.value : null)
    if (chosen) {
      apply(chosen)
      return
    }

    systemQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemQuery.addEventListener('change', followSystem)
    apply(systemQuery.matches ? 'dark' : 'light')
  })

  onUnmounted(() => {
    systemQuery?.removeEventListener('change', followSystem)
  })

  return { theme, toggle }
}
