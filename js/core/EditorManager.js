import { DEFAULTS, PRESETS, applyPreset, sanitize } from '../world/config.js'

/**
 * Editor vs play mode and draft world config.
 */
export class EditorManager {
  /**
   * @param {Partial<import('../world/config.js').WorldConfig>} [initial]
   */
  constructor(initial = {}) {
    /** @type {'editing' | 'playing'} */
    this.mode = 'editing'
    this.draft = sanitize(initial)
    /** @type {import('../world/config.js').WorldConfig | null} */
    this.snapshot = null
  }

  get editing() {
    return this.mode === 'editing'
  }

  get playing() {
    return this.mode === 'playing'
  }

  /**
   * @param {Partial<import('../world/config.js').WorldConfig>} patch
   */
  updateDraft(patch) {
    this.draft = sanitize({ ...this.draft, ...patch })
    return this.draft
  }

  /** @param {string} name */
  applyPreset(name) {
    this.draft = applyPreset(name, { seed: this.draft.seed, resolution: this.draft.resolution })
    return this.draft
  }

  resetDefaults() {
    this.draft = sanitize({
      ...DEFAULTS,
      seed: this.draft.seed,
      resolution: this.draft.resolution,
    })
    return this.draft
  }

  /** Enter editor; keep a snapshot when a game exists. */
  enterEditor(hasGame) {
    if (hasGame && this.playing) {
      this.snapshot = { ...this.draft }
    }
    this.mode = 'editing'
    return this.draft
  }

  /** Commit draft and switch to playing (paused). */
  commit() {
    this.draft = sanitize(this.draft)
    this.snapshot = null
    this.mode = 'playing'
    return this.draft
  }

  /**
   * Cancel preview and restore snapshot draft if any.
   * @returns {{ restored: boolean, draft: import('../world/config.js').WorldConfig }}
   */
  cancel() {
    if (this.snapshot) {
      this.draft = sanitize(this.snapshot)
      this.snapshot = null
      this.mode = 'playing'
      return { restored: true, draft: this.draft }
    }
    this.mode = 'editing'
    return { restored: false, draft: this.draft }
  }

  exportJson() {
    return JSON.stringify(sanitize(this.draft), null, 2)
  }

  /**
   * @param {string} text
   * @returns {import('../world/config.js').WorldConfig}
   */
  importJson(text) {
    const parsed = JSON.parse(text)
    this.draft = sanitize(parsed)
    return this.draft
  }

  presetNames() {
    return Object.keys(PRESETS)
  }
}
