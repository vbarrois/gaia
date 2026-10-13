/**
 * Maps keyboard / HUD actions. Does not know about Three.js.
 * @param {string} key
 * @param {boolean} isTyping
 * @returns {'randomSeed' | 'toggleWireframe' | 'togglePanel' | 'toggleMute' | 'reset' | null}
 */
export function mapKeyToAction(key, isTyping) {
  if (isTyping) return null
  switch (key.toLowerCase()) {
    case 'r':
      return 'randomSeed'
    case 'w':
      return 'toggleWireframe'
    case 'p':
      return 'togglePanel'
    case 'm':
      return 'toggleMute'
    default:
      return null
  }
}

const TAP_MAX_MOVE = 8
const TAP_MAX_MS = 650

/**
 * Clavier + pointeur canvas (tap court vs drag caméra), style Gaya.
 */
export class InputManager {
  /**
   * @param {{
   *   onAction: (action: string) => void,
   *   onTap?: (event: PointerEvent) => void,
   *   onHover?: (event: PointerEvent) => void,
   *   onHoverEnd?: () => void,
   * }} handlers
   */
  constructor(handlers) {
    this.handlers = handlers
    /** @type {HTMLElement | null} */
    this.canvas = null
    /** @type {{ id: number, x: number, y: number, max: number, time: number, cancel: boolean } | null} */
    this.origin = null
    this.pointers = new Set()

    this.boundKey = (event) => {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
      const action = mapKeyToAction(event.key, typing)
      if (action) this.handlers.onAction(action)
    }

    this.boundDown = (event) => {
      this.pointers.add(event.pointerId)
      if (event.button !== 0) return
      if (this.pointers.size === 1) {
        this.origin = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          max: 0,
          time: performance.now(),
          cancel: false,
        }
      } else if (this.origin) {
        this.origin.cancel = true
      }
    }

    this.boundMove = (event) => {
      if (this.origin && event.pointerId === this.origin.id) {
        this.origin.max = Math.max(
          this.origin.max,
          Math.hypot(event.clientX - this.origin.x, event.clientY - this.origin.y),
        )
      }
      // Hover / curseur zone : seulement sans drag en cours.
      if (!this.origin && this.handlers.onHover) this.handlers.onHover(event)
    }

    this.boundUp = (event) => {
      const candidate = this.origin && event.pointerId === this.origin.id ? this.origin : null
      this.pointers.delete(event.pointerId)
      if (
        candidate &&
        !candidate.cancel &&
        candidate.max < TAP_MAX_MOVE &&
        performance.now() - candidate.time < TAP_MAX_MS
      ) {
        this.handlers.onTap?.(event)
      }
      if (candidate) this.origin = null
    }

    this.boundCancel = (event) => {
      this.pointers.delete(event.pointerId)
      this.origin = null
    }

    this.boundLeave = () => {
      this.handlers.onHoverEnd?.()
    }

    this.boundContext = (event) => event.preventDefault()
  }

  bind() {
    window.addEventListener('keydown', this.boundKey)
  }

  /**
   * @param {HTMLElement} canvas
   */
  bindCanvas(canvas) {
    this.unbindCanvas()
    this.canvas = canvas
    canvas.addEventListener('pointerdown', this.boundDown, { capture: true })
    canvas.addEventListener('pointermove', this.boundMove)
    canvas.addEventListener('pointerup', this.boundUp, { capture: true })
    canvas.addEventListener('pointercancel', this.boundCancel)
    canvas.addEventListener('pointerleave', this.boundLeave)
    canvas.addEventListener('contextmenu', this.boundContext)
    canvas.style.cursor = 'crosshair'
  }

  unbindCanvas() {
    const canvas = this.canvas
    if (!canvas) return
    canvas.removeEventListener('pointerdown', this.boundDown, { capture: true })
    canvas.removeEventListener('pointermove', this.boundMove)
    canvas.removeEventListener('pointerup', this.boundUp, { capture: true })
    canvas.removeEventListener('pointercancel', this.boundCancel)
    canvas.removeEventListener('pointerleave', this.boundLeave)
    canvas.removeEventListener('contextmenu', this.boundContext)
    this.canvas = null
    this.origin = null
    this.pointers.clear()
  }

  dispose() {
    if (typeof window !== 'undefined') window.removeEventListener('keydown', this.boundKey)
    this.unbindCanvas()
  }
}
