import { ref } from 'vue'

/** Short notices at the bottom of the screen: saved, published, what went wrong. */

export interface Toast {
  id: number
  text: string
  tone?: 'error'
  link?: { href: string, label: string }
}

export const toasts = ref<Toast[]>([])

let nextId = 1

export const dismissToast = (id: number) => {
  toasts.value = toasts.value.filter((item) => item.id !== id)
}

/** Shows a notice; `timeout: 0` keeps it until it is replaced or dismissed. */
export const toast = (text: string, options: Omit<Toast, 'id' | 'text'> & { timeout?: number } = {}) => {
  const { timeout = options.tone === 'error' ? 7000 : 4000, ...rest } = options
  const id = nextId++
  toasts.value = [...toasts.value.slice(-2), { id, text, ...rest }]
  if (timeout) setTimeout(() => dismissToast(id), timeout)
  return id
}
