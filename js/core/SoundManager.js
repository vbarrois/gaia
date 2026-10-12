/** @typedef {'ui' | 'generate' | 'panel' | 'mute'} SoundId */

export const SOUND_PRESETS = {
  ui: { freq: 880, duration: 0.06, type: 'triangle', gain: 0.04 },
  generate: { freq: 196, duration: 0.22, type: 'sine', gain: 0.05 },
  panel: { freq: 523, duration: 0.08, type: 'triangle', gain: 0.035 },
  mute: { freq: 140, duration: 0.05, type: 'square', gain: 0.03 },
}

/**
 * @param {SoundId} id
 */
export function getSoundPreset(id) {
  return SOUND_PRESETS[id] ?? SOUND_PRESETS.ui
}

export class SoundManager {
  constructor() {
    this.muted = false
    /** @type {AudioContext | null} */
    this.ctx = null
  }

  /**
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.muted = muted
    if (muted && this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend()
    } else if (!muted && this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  unlock() {
    if (!window.AudioContext) return
    if (!this.ctx) this.ctx = new window.AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  /**
   * @param {SoundId} id
   */
  play(id) {
    if (this.muted) return
    this.unlock()
    if (!this.ctx) return
    const preset = getSoundPreset(id)
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = /** @type {OscillatorType} */ (preset.type)
    osc.frequency.setValueAtTime(preset.freq, this.ctx.currentTime)
    if (id === 'generate') {
      osc.frequency.exponentialRampToValueAtTime(preset.freq * 1.8, this.ctx.currentTime + preset.duration)
    }
    gain.gain.setValueAtTime(preset.gain, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + preset.duration)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + preset.duration)
  }
}
