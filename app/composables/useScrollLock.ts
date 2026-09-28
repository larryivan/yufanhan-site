/**
 * Reference-counted body scroll lock.
 *
 * The header menu and the search modal can both be open during the same tick
 * (opening search from the mobile menu closes one and opens the other), so a
 * naive `body.style.overflow = ''` in either place can unlock the page while
 * the other still needs it. Counting the holders removes that ordering hazard.
 */

let holders = 0
let previousOverflow = ''
let previousPaddingRight = ''

const lockBody = () => {
  if (!import.meta.client) return
  if (holders === 0) {
    const { body } = document
    // Compensate for the disappearing scrollbar so the layout does not jump.
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    previousOverflow = body.style.overflow
    previousPaddingRight = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }
  }
  holders += 1
}

const unlockBody = () => {
  if (!import.meta.client) return
  if (holders === 0) return
  holders -= 1
  if (holders === 0) {
    document.body.style.overflow = previousOverflow
    document.body.style.paddingRight = previousPaddingRight
  }
}

export const useScrollLock = () => {
  // Tracks whether *this* caller currently holds the lock, so repeated
  // lock() calls or an unmount mid-lock cannot unbalance the counter.
  const isHolding = ref(false)

  const lock = () => {
    if (isHolding.value) return
    isHolding.value = true
    lockBody()
  }

  const unlock = () => {
    if (!isHolding.value) return
    isHolding.value = false
    unlockBody()
  }

  const set = (shouldLock: boolean) => (shouldLock ? lock() : unlock())

  onScopeDispose(unlock)

  return { lock, unlock, set }
}
