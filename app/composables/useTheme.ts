import { onMounted } from 'vue'

type Theme = 'light' | 'dark'

export const useTheme = () => {
  const theme = useState<Theme>('theme', () => 'light')

  const apply = (value: Theme) => {
    theme.value = value
    if (process.client) {
      document.documentElement.dataset.theme = value
      localStorage.setItem('theme', value)
    }
  }

  const toggle = () => {
    apply(theme.value === 'light' ? 'dark' : 'light')
  }

  onMounted(() => {
    const stored = process.client ? (localStorage.getItem('theme') as Theme | null) : null
    if (stored === 'light' || stored === 'dark') {
      apply(stored)
      return
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      apply('dark')
    } else {
      apply('light')
    }
  })

  return { theme, toggle, apply }
}
