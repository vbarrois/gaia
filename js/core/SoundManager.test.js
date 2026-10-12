import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SOUND_PRESETS, getSoundPreset } from './SoundManager.js'

describe('getSoundPreset', () => {
  it('returns a known cue and falls back to ui', () => {
    assert.equal(getSoundPreset('generate').freq, SOUND_PRESETS.generate.freq)
    assert.equal(getSoundPreset(/** @type {never} */ ('nope')).freq, SOUND_PRESETS.ui.freq)
  })

  it('keeps short, quiet tones', () => {
    for (const preset of Object.values(SOUND_PRESETS)) {
      assert.ok(preset.duration <= 0.3)
      assert.ok(preset.gain <= 0.08)
      assert.ok(preset.freq > 0)
    }
  })
})
