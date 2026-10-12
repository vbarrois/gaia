import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mapKeyToAction } from './InputManager.js'

describe('mapKeyToAction', () => {
  it('returns null while typing in a field', () => {
    assert.equal(mapKeyToAction('r', true), null)
  })

  it('maps gameplay shortcuts', () => {
    assert.equal(mapKeyToAction('R', false), 'randomSeed')
    assert.equal(mapKeyToAction('w', false), 'toggleWireframe')
    assert.equal(mapKeyToAction('P', false), 'togglePanel')
    assert.equal(mapKeyToAction('m', false), 'toggleMute')
    assert.equal(mapKeyToAction('x', false), null)
  })
})
