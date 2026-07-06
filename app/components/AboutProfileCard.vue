<!--
  Installed from https://vue-bits.dev/ui/
-->

<template>
  <div ref="wrapRef" :class="`pc-card-wrapper ${className} ${props.isHighlighted ? 'highlighted' : ''}`.trim()" :style="cardStyle">
    <section ref="cardRef" class="pc-card">
      <div class="pc-inside" :class="{ flipped: isFlipped }">
        <div class="pc-shine" />

        <div class="pc-glare" />

        <div class="pc-content pc-avatar-content">
          <img
            v-if="!isFlipped"
            class="avatar"
            :src="avatarUrl"
            :alt="`${name || 'User'} avatar`"
            loading="eager"
            decoding="async"
            fetchpriority="high"
            @error="handleAvatarError"
          >

          <div v-if="showUserInfo" class="pc-user-info">
            <div class="pc-user-details">
              <div class="pc-mini-avatar">
                <img
                  :src="barAvatarUrl || miniAvatarUrl || avatarUrl"
                  :alt="`${name || 'User'} bar avatar`"
                  loading="lazy"
                  decoding="async"
                  fetchpriority="low"
                  @error="handleBarAvatarError"
                >
              </div>

              <div class="pc-user-text">
                <div class="pc-handle">@{{ handle }}</div>

                <div class="pc-status">{{ status }}</div>
              </div>
            </div>

            <div class="pc-action-buttons">
              <button
                class="pc-contact-btn"
                style="pointer-events: auto"
                type="button"
                :aria-label="`View ${name || 'user'} details`"
                @click="flipCard($event)"
              >
                {{ isFlipped ? 'Back' : contactText }}
              </button>
            </div>
          </div>
        </div>

        <div class="pc-content">
          <div class="pc-details">
            <div class="pc-name">{{ name }}</div>

            <div class="pc-title">{{ title }}</div>

            <div v-if="isFlipped" class="pc-description-section">
              <p class="pc-description-text" v-html="description || 'No description available yet...'" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'

interface Props {
  avatarUrl?: string
  iconUrl?: string
  grainUrl?: string
  behindGradient?: string
  innerGradient?: string
  showBehindGradient?: boolean
  className?: string
  enableTilt?: boolean
  miniAvatarUrl?: string
  barAvatarUrl?: string
  name?: string
  title?: string
  handle?: string
  status?: string
  contactText?: string
  showUserInfo?: boolean
  description?: string
  isHighlighted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  avatarUrl: '',
  iconUrl: 'https://static.igem.wiki/teams/5643/img/iconpattern.webp',
  grainUrl: 'https://static.igem.wiki/teams/5643/img/grain.webp',
  behindGradient: undefined,
  innerGradient: undefined,
  showBehindGradient: true,
  className: '',
  enableTilt: true,
  miniAvatarUrl: undefined,
  barAvatarUrl: undefined,
  name: 'Javi A. Torres',
  title: 'Software Engineer',
  handle: 'javicodes',
  status: '',
  contactText: 'Contact',
  showUserInfo: true,
  description: '',
  isHighlighted: false
})

const isFlipped = ref(false)

const wrapRef = useTemplateRef<HTMLDivElement>('wrapRef')
const cardRef = useTemplateRef<HTMLElement>('cardRef')

const DEFAULT_BEHIND_GRADIENT =
  'radial-gradient(farthest-side circle at var(--pointer-x) var(--pointer-y),hsla(180,70%,85%,var(--card-opacity)) 4%,hsla(180,50%,75%,calc(var(--card-opacity)*0.75)) 10%,hsla(180,30%,65%,calc(var(--card-opacity)*0.5)) 50%,hsla(180,0%,60%,0) 100%),radial-gradient(35% 52% at 55% 20%,#5dcac6aa 0%,#008794000 100%),radial-gradient(100% 100% at 50% 50%,#0e9f99ff 1%,#062570000 76%),conic-gradient(from 124deg at 50% 50%,#008794ff 0%,#5dcac6ff 40%,#b2eeebff 60%,#008794ff 100%))'

const DEFAULT_INNER_GRADIENT = 'linear-gradient(145deg,#e6f2fedd 0%,#b2eeebbb 50%,#5dcac688 100%)'

const ANIMATION_CONFIG = {
  SMOOTH_DURATION: 600,
  INITIAL_DURATION: 1500,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60
} as const

const clamp = (value: number, min = 0, max = 100): number => Math.min(Math.max(value, min), max)

const round = (value: number, precision = 3): number => parseFloat(value.toFixed(precision))

const adjust = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number): number =>
  round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin))

const easeInOutCubic = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

let rafId: number | null = null
let lastUpdateTime = 0
const THROTTLE_DELAY = 32

let io: IntersectionObserver | null = null
let needsUpdate = false
let pointerClientX = 0
let pointerClientY = 0
let cachedRect: DOMRect | null = null
let hasRunInitialAnimation = false

const globalRafManager = {
  callbacks: new Set<() => void>(),
  rafId: null as number | null,

  add(callback: () => void) {
    this.callbacks.add(callback)
    if (!this.rafId) {
      this.start()
    }
  },

  remove(callback: () => void) {
    this.callbacks.delete(callback)
    if (this.callbacks.size === 0 && this.rafId) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  },

  start() {
    const loop = () => {
      this.callbacks.forEach((callback) => callback())
      if (this.callbacks.size > 0) {
        this.rafId = requestAnimationFrame(loop)
      }
    }
    this.rafId = requestAnimationFrame(loop)
  }
}

const updateCardTransform = (offsetX: number, offsetY: number, card: HTMLElement, wrap: HTMLElement) => {
  const width = card.clientWidth
  const height = card.clientHeight

  const percentX = clamp((100 / width) * offsetX)
  const percentY = clamp((100 / height) * offsetY)

  const centerX = percentX - 50
  const centerY = percentY - 50

  const rotateX = round(-(centerX / 8))
  const rotateY = round(centerY / 8)
  const pointerFromCenter = clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)

  const style = wrap.style
  style.setProperty('--pointer-x', `${percentX}%`)
  style.setProperty('--pointer-y', `${percentY}%`)
  style.setProperty('--background-x', `${adjust(percentX, 0, 100, 35, 65)}%`)
  style.setProperty('--background-y', `${adjust(percentY, 0, 100, 35, 65)}%`)
  style.setProperty('--pointer-from-center', `${pointerFromCenter}`)
  style.setProperty('--pointer-from-top', `${percentY / 100}`)
  style.setProperty('--pointer-from-left', `${percentX / 100}`)
  style.setProperty('--rotate-x', `${rotateX}deg`)
  style.setProperty('--rotate-y', `${rotateY}deg`)
}

const rafCallback = () => {
  const now = performance.now()
  if (now - lastUpdateTime < THROTTLE_DELAY) return

  if (needsUpdate && cardRef.value && wrapRef.value && cachedRect) {
    updateCardTransform(pointerClientX - cachedRect.left, pointerClientY - cachedRect.top, cardRef.value, wrapRef.value)
    needsUpdate = false
    lastUpdateTime = now
  }
}

const startRafLoop = () => {
  globalRafManager.add(rafCallback)
}

const stopRafLoop = () => {
  globalRafManager.remove(rafCallback)
}

const createSmoothAnimation = (
  duration: number,
  startX: number,
  startY: number,
  card: HTMLElement,
  wrap: HTMLElement
) => {
  const startTime = performance.now()
  const targetX = wrap.clientWidth / 2
  const targetY = wrap.clientHeight / 2

  const animationLoop = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = clamp(elapsed / duration)
    const easedProgress = easeInOutCubic(progress)

    const currentX = adjust(easedProgress, 0, 1, startX, targetX)
    const currentY = adjust(easedProgress, 0, 1, startY, targetY)

    updateCardTransform(currentX, currentY, card, wrap)

    if (progress < 1) {
      rafId = requestAnimationFrame(animationLoop)
    }
  }

  rafId = requestAnimationFrame(animationLoop)
}

const cancelAnimation = () => {
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

const handlePointerMove = (event: PointerEvent) => {
  if (!cardRef.value || !wrapRef.value || !props.enableTilt) return
  if (event.pointerType === 'touch') return

  pointerClientX = event.clientX
  pointerClientY = event.clientY
  needsUpdate = true
}

const handlePointerEnter = (event: PointerEvent) => {
  const card = cardRef.value
  const wrap = wrapRef.value

  if (!card || !wrap || !props.enableTilt) return
  if (event.pointerType === 'touch') return

  cachedRect = card.getBoundingClientRect()
  cancelAnimation()
  wrap.classList.add('active')
  card.classList.add('active')
  startRafLoop()
}

const handlePointerLeave = (event: PointerEvent) => {
  const card = cardRef.value
  const wrap = wrapRef.value

  if (!card || !wrap || !props.enableTilt) return
  if (event.pointerType === 'touch') return

  createSmoothAnimation(ANIMATION_CONFIG.SMOOTH_DURATION, event.offsetX, event.offsetY, card, wrap)
  wrap.classList.remove('active')
  card.classList.remove('active')
  stopRafLoop()
  cachedRect = null
}

const addPointerListeners = () => {
  const card = cardRef.value
  if (!card) return

  card.addEventListener('pointerenter', handlePointerEnter)
  card.addEventListener('pointermove', handlePointerMove)
  card.addEventListener('pointerleave', handlePointerLeave)
}

const removePointerListeners = () => {
  const card = cardRef.value
  if (!card) return

  card.removeEventListener('pointerenter', handlePointerEnter)
  card.removeEventListener('pointermove', handlePointerMove)
  card.removeEventListener('pointerleave', handlePointerLeave)
}

const cardStyle = computed(() => ({
  '--icon': props.iconUrl ? `url(${props.iconUrl})` : 'none',
  '--grain': props.grainUrl ? `url(${props.grainUrl})` : 'none',
  '--behind-gradient': props.showBehindGradient ? (props.behindGradient ?? DEFAULT_BEHIND_GRADIENT) : 'none',
  '--inner-gradient': props.innerGradient ?? DEFAULT_INNER_GRADIENT
}))

const flipCard = (event?: Event) => {
  const wrap = wrapRef.value

  if (event && event.target) {
    const button = event.target as HTMLButtonElement
    button.classList.add('clicked')
    setTimeout(() => {
      button.classList.remove('clicked')
    }, 600)
  }

  if (wrap) {
    wrap.classList.add('flipping')
    setTimeout(() => {
      wrap.classList.remove('flipping')
    }, 400)
  }

  isFlipped.value = !isFlipped.value
}

const handleAvatarError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

const handleBarAvatarError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.opacity = '0.5'
  target.src = props.miniAvatarUrl || props.avatarUrl
}

onMounted(() => {
  const wrap = wrapRef.value
  if (!wrap) return

  io = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return
      if (!props.enableTilt) return

      if (entry.isIntersecting) {
        addPointerListeners()
        if (!hasRunInitialAnimation && cardRef.value && wrapRef.value) {
          const initialX = wrapRef.value.clientWidth - ANIMATION_CONFIG.INITIAL_X_OFFSET
          const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET
          updateCardTransform(initialX, initialY, cardRef.value, wrapRef.value)
          createSmoothAnimation(ANIMATION_CONFIG.INITIAL_DURATION, initialX, initialY, cardRef.value, wrapRef.value)
          hasRunInitialAnimation = true
        }
      } else {
        removePointerListeners()
        stopRafLoop()
        cancelAnimation()
        cachedRect = null
      }
    },
    {
      rootMargin: '50px',
      threshold: [0, 0.1, 0.5, 1.0]
    }
  )

  io.observe(wrap)
})

onUnmounted(() => {
  removePointerListeners()
  stopRafLoop()
  cancelAnimation()
  io?.disconnect()
  io = null
})
</script>

<style scoped>
.pc-card-wrapper {
  --pointer-x: 50%;
  --pointer-y: 50%;
  --pointer-from-center: 0;
  --pointer-from-top: 0.5;
  --pointer-from-left: 0.5;
  --card-opacity: 0;
  --rotate-x: 0deg;
  --rotate-y: 0deg;
  --background-x: 50%;
  --background-y: 50%;
  --grain: none;
  --icon: none;
  --behind-gradient: none;
  --inner-gradient: none;
  --sunpillar-1: #008794;
  --sunpillar-2: #0e9f99;
  --sunpillar-3: #5dcac6;
  --sunpillar-4: #b2eeeb;
  --sunpillar-5: #e97e35;
  --sunpillar-6: #ffb07b;
  --sunpillar-clr-1: var(--sunpillar-1);
  --sunpillar-clr-2: var(--sunpillar-2);
  --sunpillar-clr-3: var(--sunpillar-3);
  --sunpillar-clr-4: var(--sunpillar-4);
  --sunpillar-clr-5: var(--sunpillar-5);
  --sunpillar-clr-6: var(--sunpillar-6);
  --card-radius: 30px;
}

.pc-card-wrapper {
  width: min(100%, 388px);
  margin-inline: auto;
  perspective: 500px;
  transform: translate3d(0, 0, 0.1px);
  position: relative;
  touch-action: pan-y pinch-zoom;
  transition: transform 0.3s var(--ease-out);
}

.pc-card-wrapper.flipping {
  transform: translate3d(0, 0, 0.1px) scale(1.02);
}

.pc-card-wrapper::before {
  content: '';
  position: absolute;
  inset: -10px;
  background: inherit;
  background-position: inherit;
  border-radius: inherit;
  transition: all 0.5s ease;
  filter: contrast(2) saturate(2) blur(36px);
  transform: scale(0.8) translate3d(0, 0, 0.1px);
  background-size: 100% 100%;
  background-image: var(--behind-gradient);
}

.pc-card-wrapper:hover,
.pc-card-wrapper.active {
  --card-opacity: 1;
}

.pc-card-wrapper:hover::before,
.pc-card-wrapper.active::before {
  filter: contrast(1) saturate(2) blur(40px) opacity(1);
  transform: scale(0.9) translate3d(0, 0, 0.1px);
}

.pc-card {
  height: 80svh;
  max-height: 540px;
  display: grid;
  aspect-ratio: 0.718;
  border-radius: var(--card-radius);
  position: relative;
  background-blend-mode: normal, normal;
  box-shadow: rgba(0, 0, 0, 0.8) calc((var(--pointer-from-left) * 10px) - 3px)
    calc((var(--pointer-from-top) * 20px) - 6px) 20px -5px;
  transition:
    transform 0.4s var(--ease-out),
    box-shadow 0.4s var(--ease-out);
  transform: translate3d(0, 0, 0.1px) rotateX(0deg) rotateY(0deg);
  transform-style: preserve-3d;
  will-change: transform;
  background-size: 100% 100%;
  background-position: 0 0, 50% 50%;
  background-image:
    radial-gradient(
      farthest-side circle at var(--pointer-x) var(--pointer-y),
      hsla(180, 70%, 85%, var(--card-opacity)) 4%,
      hsla(180, 50%, 75%, calc(var(--card-opacity) * 0.75)) 10%,
      hsla(180, 30%, 65%, calc(var(--card-opacity) * 0.5)) 50%,
      hsla(180, 0%, 60%, 0) 100%
    ),
    conic-gradient(from 124deg at 50% 50%, #008794ff 0%, #5dcac6ff 40%, #b2eeebff 60%, #008794ff 100%);
  overflow: hidden;
  contain: layout style paint;
}

.pc-card.flipped {
  transform: translate3d(0, 0, 0.1px) rotateX(0deg) rotateY(180deg);
  box-shadow: rgba(0, 0, 0, 0.6) calc((var(--pointer-from-left) * 8px) - 2px)
    calc((var(--pointer-from-top) * 16px) - 4px) 30px -3px;
}

.pc-card:hover:not(.flipped),
.pc-card.active:not(.flipped) {
  transition: none;
  transform: translate3d(0, 0, 0.1px) rotateX(var(--rotate-y)) rotateY(var(--rotate-x));
}

.pc-card:hover.flipped,
.pc-card.active.flipped {
  transition: none;
  transform: translate3d(0, 0, 0.1px) rotateX(var(--rotate-y)) rotateY(calc(180deg + var(--rotate-x)));
}

.pc-card * {
  display: grid;
  grid-area: 1/-1;
  border-radius: var(--card-radius);
  transform: translate3d(0, 0, 0.1px);
  pointer-events: none;
}

.pc-inside {
  inset: 1px;
  position: absolute;
  background-image: var(--inner-gradient);
  background-color: rgba(240, 248, 255, 0.98);
  transform: translate3d(0, 0, 0.01px);
  backface-visibility: hidden;
  border-radius: var(--card-radius);
}

.pc-shine {
  mask-image: var(--icon);
  mask-mode: luminance;
  mask-repeat: repeat;
  mask-size: 150%;
  mask-position: top calc(200% - (var(--background-y) * 5)) left calc(100% - var(--background-x));
  -webkit-mask-image: var(--icon);
  -webkit-mask-mode: luminance;
  -webkit-mask-repeat: repeat;
  -webkit-mask-size: 150%;
  -webkit-mask-position: top calc(200% - (var(--background-y) * 5)) left calc(100% - var(--background-x));
  transition: filter 0.6s ease;
  filter: brightness(0.66) contrast(1.33) saturate(0.33) opacity(0.5);
  mix-blend-mode: color-dodge;
}

.pc-shine,
.pc-shine::after {
  --space: 5%;
  --angle: -45deg;
  transform: translate3d(0, 0, 1px);
  overflow: hidden;
  z-index: 3;
  background: transparent;
  background-size: cover;
  background-position: center;
  background-image: repeating-linear-gradient(
    0deg,
    var(--sunpillar-clr-1) calc(var(--space) * 1),
    var(--sunpillar-clr-2) calc(var(--space) * 2),
    var(--sunpillar-clr-3) calc(var(--space) * 3),
    var(--sunpillar-clr-4) calc(var(--space) * 4),
    var(--sunpillar-clr-5) calc(var(--space) * 5),
    var(--sunpillar-clr-6) calc(var(--space) * 6),
    var(--sunpillar-clr-1) calc(var(--space) * 7)
  );
  background-position: 0 var(--background-y);
  background-blend-mode: color;
  background-size: 500% 500%;
  background-repeat: repeat;
}

.pc-shine::before,
.pc-shine::after {
  content: '';
  background-position: center;
  background-size: cover;
  grid-area: 1/1;
  opacity: 0;
}

.pc-card:hover .pc-shine,
.pc-card.active .pc-shine {
  filter: brightness(0.85) contrast(1.5) saturate(0.5);
}

.pc-card:hover .pc-shine::before,
.pc-card.active .pc-shine::before,
.pc-card:hover .pc-shine::after,
.pc-card.active .pc-shine::after {
  opacity: 1;
}

.pc-shine::before {
  background-image:
    linear-gradient(
      45deg,
      var(--sunpillar-4),
      var(--sunpillar-5),
      var(--sunpillar-6),
      var(--sunpillar-1),
      var(--sunpillar-2),
      var(--sunpillar-3)
    );
  background-size: 250% 250%;
  background-position: var(--pointer-x) var(--pointer-y);
  background-blend-mode: color-dodge;
  filter: brightness(calc(2 - var(--pointer-from-center))) contrast(calc(var(--pointer-from-center) + 2))
    saturate(calc(0.5 + var(--pointer-from-center)));
  mix-blend-mode: soft-light;
}

.pc-shine::after {
  content: '';
  background-image: repeating-linear-gradient(
    0deg,
    var(--sunpillar-clr-1) calc(5% * 1),
    var(--sunpillar-clr-2) calc(5% * 2),
    var(--sunpillar-clr-3) calc(5% * 3),
    var(--sunpillar-clr-4) calc(5% * 4),
    var(--sunpillar-clr-5) calc(5% * 5),
    var(--sunpillar-clr-6) calc(5% * 6),
    var(--sunpillar-clr-1) calc(5% * 7)
  );
  background-position: 0 var(--background-y);
  background-size: 200% 300%;
  mix-blend-mode: difference;
  filter: brightness(0.8) contrast(1.5);
}

.pc-glare {
  transform: translate3d(0, 0, 1.1px);
  overflow: hidden;
  background-image: radial-gradient(
    farthest-corner circle at var(--pointer-x) var(--pointer-y),
    hsl(248, 25%, 80%) 12%,
    hsla(207, 40%, 30%, 0.8) 90%
  );
  mix-blend-mode: overlay;
  filter: brightness(0.8) contrast(1.2);
  z-index: 4;
}

.pc-avatar-content {
  mix-blend-mode: screen;
  overflow: hidden;
}

.pc-avatar-content .avatar {
  width: 100%;
  max-height: 80%;
  object-fit: contain;
  position: absolute;
  left: 50%;
  transform: translateX(-50%) scale(1);
  bottom: 2px;
  opacity: calc(1.75 - var(--pointer-from-center));
  transition:
    opacity 0.6s var(--ease-out),
    transform 0.6s var(--ease-out);
}

.pc-avatar-content::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  mask: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0) 60%,
    rgba(0, 0, 0, 1) 90%,
    rgba(0, 0, 0, 1) 100%
  );
  pointer-events: none;
}

.pc-user-info {
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 20px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(8, 135, 148, 0.2);
  border-radius: 15px;
  padding: 12px 14px;
  pointer-events: auto;
}

.pc-user-details {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pc-mini-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.pc-mini-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.pc-user-text {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 6px;
}

.pc-handle {
  font-size: 14px;
  font-weight: 500;
  color: #062570;
  line-height: 1;
}

.pc-status {
  font-size: 14px;
  color: #008794;
  line-height: 1;
}

.pc-contact-btn {
  border: 1px solid #008794;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #008794;
  cursor: pointer;
  transition: all 0.4s var(--ease-out);
  background: rgba(255, 255, 255, 0.5);
  position: relative;
  overflow: hidden;
}

.pc-contact-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  transition: left 0.6s var(--ease-out);
}

.pc-contact-btn:hover {
  border-color: #062570;
  color: #062570;
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(8, 135, 148, 0.2);
}

.pc-contact-btn:hover::before {
  left: 100%;
}

.pc-contact-btn:active {
  transform: translateY(-1px) scale(1.01);
  transition: all 0.1s ease;
}

.pc-content {
  max-height: 100%;
  overflow: hidden;
  text-align: center;
  position: relative;
  transform: translate3d(
    calc(var(--pointer-from-left) * -6px + 3px),
    calc(var(--pointer-from-top) * -6px + 3px),
    0.1px
  ) !important;
  z-index: 5;
  mix-blend-mode: normal;
  filter: contrast(1.08) brightness(1.02) saturate(0.95) hue-rotate(5deg);
}

.pc-details {
  width: 100%;
  position: absolute;
  top: 2.5em;
  display: flex;
  flex-direction: column;
}

.pc-details .pc-name {
  font-weight: 700;
  margin: 0;
  font-size: min(5svh, 3em);
  line-height: 1.2;
  min-height: 1.2em;
  color: #062570;
  text-shadow:
    0 2px 4px rgba(255, 255, 255, 0.9),
    0 0 8px rgba(255, 255, 255, 0.6);
}

.pc-details .pc-title {
  font-weight: 600;
  position: relative;
  top: -4px;
  white-space: nowrap;
  font-size: 16px;
  margin: 0 auto;
  width: min-content;
  line-height: 1.4;
  color: #008794;
  text-shadow:
    0 2px 3px rgba(255, 255, 255, 0.8),
    0 0 6px rgba(255, 255, 255, 0.5);
}

.pc-description-section {
  margin-top: 20px;
  padding: 0 20px;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInSlideUp 0.8s var(--ease-out) 0.3s forwards;
}

.pc-description-text {
  font-size: 16px;
  line-height: 1.5;
  color: #1e293b;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  margin: 0;
  font-weight: 500;
  text-align: left;
}

.pc-contact-btn.clicked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: ripple 0.6s ease-out;
}

.pc-card-wrapper.highlighted {
  animation: subtleHighlight 1.5s ease-out;
  transition: all 0.3s ease;
}

.pc-card-wrapper.highlighted .pc-card {
  box-shadow:
    0 8px 32px rgba(59, 130, 246, 0.3),
    0 4px 16px rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  transform: translateY(-4px);
}

.pc-card-wrapper.about-profile-card {
  --sunpillar-1: #163057;
  --sunpillar-2: #2a8794;
  --sunpillar-3: #8fd4d5;
  --sunpillar-4: #f6f7ef;
  --sunpillar-5: #d8b066;
  --sunpillar-6: #9baee8;
  --card-radius: 30px;
  width: min(100%, 372px);
}

.pc-card-wrapper.about-profile-card::before {
  inset: -12px;
  filter: contrast(1.02) saturate(1.12) blur(34px) opacity(0.28);
  transform: scale(0.88) translate3d(0, 0, 0.1px);
}

.pc-card-wrapper.about-profile-card:hover::before,
.pc-card-wrapper.about-profile-card.active::before {
  filter: contrast(1.04) saturate(1.18) blur(38px) opacity(0.42);
  transform: scale(0.92) translate3d(0, 0, 0.1px);
}

.pc-card-wrapper.about-profile-card .pc-card {
  width: 100%;
  height: auto !important;
  max-height: none;
  background-image:
    radial-gradient(
      farthest-side circle at var(--pointer-x) var(--pointer-y),
      hsla(222, 42%, 88%, calc(var(--card-opacity) * 0.35)) 4%,
      hsla(212, 28%, 78%, calc(var(--card-opacity) * 0.2)) 20%,
      hsla(212, 14%, 70%, 0) 64%
    ),
    linear-gradient(145deg, rgba(255, 253, 248, 0.96), rgba(238, 247, 244, 0.86) 48%, rgba(183, 217, 224, 0.78));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.74),
    0 30px 78px rgba(15, 23, 42, 0.1),
    0 24px 70px -42px rgba(42, 135, 148, 0.36);
  border: 1px solid var(--line);
}

.pc-card-wrapper.about-profile-card .pc-inside {
  overflow: hidden;
  background-color: rgba(255, 253, 248, 0.82);
}

.pc-card-wrapper.about-profile-card .pc-inside::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #163057;
  mask-image: var(--icon);
  mask-mode: luminance;
  mask-position: 22px 20px;
  mask-repeat: repeat;
  mask-size: 108px auto;
  -webkit-mask-image: var(--icon);
  -webkit-mask-mode: luminance;
  -webkit-mask-position: 22px 20px;
  -webkit-mask-repeat: repeat;
  -webkit-mask-size: 108px auto;
  opacity: 0.12;
  mix-blend-mode: multiply;
  pointer-events: none;
}

.pc-card-wrapper.about-profile-card .pc-glare {
  filter: brightness(1.04) contrast(1.06) saturate(0.78);
  opacity: 0.3;
}

.pc-card-wrapper.about-profile-card .pc-shine {
  filter: brightness(0.98) contrast(1.08) saturate(0.32) opacity(0.36);
  mix-blend-mode: soft-light;
}

.pc-card-wrapper.about-profile-card .pc-avatar-content .avatar {
  bottom: -4px;
  transform: translateX(-50%) scale(0.96);
  filter: saturate(0.78) contrast(0.96) brightness(1.03);
  opacity: calc(0.92 - (var(--pointer-from-center) * 0.12));
}

.pc-card-wrapper.about-profile-card .pc-user-info {
  bottom: 18px;
  left: 18px;
  right: 18px;
  padding: 12px 14px;
  background: rgba(255, 253, 248, 0.76);
  border-color: rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(18px) saturate(1.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.58),
    0 16px 36px rgba(15, 23, 42, 0.08);
}

.pc-card-wrapper.about-profile-card .pc-mini-avatar {
  width: 42px;
  height: 42px;
  opacity: 0.9;
}

.pc-card-wrapper.about-profile-card .pc-handle,
.pc-card-wrapper.about-profile-card .pc-name {
  color: var(--heading);
}

.pc-card-wrapper.about-profile-card .pc-status,
.pc-card-wrapper.about-profile-card .pc-title {
  color: var(--muted);
}

.pc-card-wrapper.about-profile-card .pc-contact-btn {
  color: var(--heading);
  border-color: var(--line-strong);
  background: rgba(255, 253, 248, 0.62);
  padding: 8px 14px;
  font-size: 14px;
}

.pc-card-wrapper.about-profile-card .pc-details {
  top: 2.15em;
}

.pc-card-wrapper.about-profile-card .pc-details .pc-name {
  font-size: min(4.4svh, 2.85em);
  letter-spacing: -0.04em;
}

.pc-card-wrapper.about-profile-card .pc-details .pc-title {
  font-size: 15px;
  letter-spacing: 0.02em;
}

:global(:root[data-theme='dark']) .pc-card-wrapper.about-profile-card .pc-card {
  background-image:
    radial-gradient(
      farthest-side circle at var(--pointer-x) var(--pointer-y),
      hsla(222, 42%, 74%, calc(var(--card-opacity) * 0.24)) 4%,
      hsla(212, 28%, 60%, calc(var(--card-opacity) * 0.12)) 20%,
      hsla(212, 14%, 42%, 0) 64%
    ),
    linear-gradient(145deg, rgba(18, 22, 28, 0.96), rgba(23, 27, 34, 0.86) 56%, rgba(45, 54, 69, 0.76));
}

:global(:root[data-theme='dark']) .pc-card-wrapper.about-profile-card .pc-inside {
  background-color: rgba(18, 22, 28, 0.86);
}

:global(:root[data-theme='dark']) .pc-card-wrapper.about-profile-card .pc-inside::before {
  background: #dce8ff;
  opacity: 0.08;
  mix-blend-mode: screen;
}

:global(:root[data-theme='dark']) .pc-card-wrapper.about-profile-card .pc-user-info {
  background: rgba(18, 22, 28, 0.68);
}

:global(:root[data-theme='dark']) .pc-card-wrapper.about-profile-card .pc-contact-btn {
  background: rgba(18, 22, 28, 0.54);
}

@keyframes glow-bg {
  0% {
    --bgrotate: 0deg;
  }

  100% {
    --bgrotate: 360deg;
  }
}

@keyframes holo-bg {
  0% {
    background-position:
      0 var(--background-y),
      0 0,
      center;
  }

  100% {
    background-position:
      0 var(--background-y),
      90% 90%,
      center;
  }
}

@keyframes fadeInSlideUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 0.6;
  }

  100% {
    transform: scale(4);
    opacity: 0;
  }
}

@keyframes subtleHighlight {
  0% {
    transform: scale(1);
  }

  30% {
    transform: scale(1.02);
  }

  100% {
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .pc-card {
    height: 70svh;
    max-height: 450px;
  }

  .pc-details {
    top: 2em;
  }

  .pc-details .pc-name {
    font-size: min(4svh, 2.5em);
  }

  .pc-details .pc-title {
    font-size: 14px;
  }

  .pc-user-info {
    bottom: 15px;
    left: 15px;
    right: 15px;
    padding: 10px 12px;
  }

  .pc-mini-avatar {
    width: 28px;
    height: 28px;
  }

  .pc-user-details {
    gap: 10px;
  }

  .pc-handle {
    font-size: 13px;
  }

  .pc-status {
    font-size: 10px;
  }

  .pc-contact-btn {
    padding: 6px 12px;
    font-size: 11px;
  }

  .pc-description-section {
    margin-top: 15px;
    padding: 0 15px;
  }

  .pc-description-text {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .pc-card {
    height: 60svh;
    max-height: 380px;
  }

  .pc-details {
    top: 1.5em;
  }

  .pc-details .pc-name {
    font-size: min(3.5svh, 2em);
  }

  .pc-details .pc-title {
    font-size: 12px;
    top: -4px;
  }

  .pc-user-info {
    bottom: 12px;
    left: 12px;
    right: 12px;
    padding: 8px 10px;
    border-radius: 50px;
  }

  .pc-mini-avatar {
    width: 24px;
    height: 24px;
  }

  .pc-user-details {
    gap: 8px;
  }

  .pc-handle {
    font-size: 12px;
  }

  .pc-status {
    font-size: 9px;
  }

  .pc-contact-btn {
    padding: 5px 10px;
    font-size: 10px;
    border-radius: 50px;
  }

  .pc-description-section {
    margin-top: 12px;
    padding: 0 12px;
  }

  .pc-description-text {
    font-size: 13px;
  }
}

@media (max-width: 320px) {
  .pc-card {
    height: 55svh;
    max-height: 320px;
  }

  .pc-details .pc-name {
    font-size: min(3svh, 1.5em);
  }

  .pc-details .pc-title {
    font-size: 11px;
  }

  .pc-user-info {
    padding: 6px 8px;
    border-radius: 50px;
  }

  .pc-mini-avatar {
    width: 20px;
    height: 20px;
  }

  .pc-user-details {
    gap: 6px;
  }

  .pc-handle {
    font-size: 11px;
  }

  .pc-status {
    font-size: 8px;
  }

  .pc-contact-btn {
    padding: 4px 8px;
    font-size: 9px;
    border-radius: 50px;
  }

  .pc-description-section {
    margin-top: 10px;
    padding: 0 10px;
  }

  .pc-description-text {
    font-size: 11px;
  }
}
</style>
