import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULTS, PRESETS, applyPreset, sanitize } from './config.js'

describe('sanitize', () => {
  it('fills defaults and clamps out-of-range values', () => {
    const c = sanitize({ seed: -10, amplitude: 999, resolution: 50 })
    assert.equal(c.seed, 1)
    assert.equal(c.amplitude, 48)
    assert.equal(c.resolution, 48)
    assert.equal(c.scale, DEFAULTS.scale)
  })

  it('rounds resolution to multiples of 16', () => {
    assert.equal(sanitize({ resolution: 70 }).resolution, 64)
    assert.equal(sanitize({ resolution: 80 }).resolution, 80)
  })
})

describe('applyPreset', () => {
  it('merges a known preset over the base seed', () => {
    const c = applyPreset('montagnes', { seed: 42 })
    assert.equal(c.seed, 42)
    assert.equal(c.amplitude, PRESETS.montagnes.amplitude)
    assert.equal(c.falloff, PRESETS.montagnes.falloff)
  })
})
