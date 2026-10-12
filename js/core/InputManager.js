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

export class InputManager {
  /**
   * @param {(action: string) => void} onAction
   */
  constructor(onAction) {
    this.onAction = onAction
    this.boundKey = (event) => {
      const typing =
        event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
      const action = mapKeyToAction(event.key, typing)
      if (action) this.onAction(action)
    }
  }

  bind() {
    window.addEventListener('keydown', this.boundKey)
  }

  dispose() {
    window.removeEventListener('keydown', this.boundKey)
  }
}
