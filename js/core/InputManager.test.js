import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { InputManager, mapKeyToAction } from './InputManager.js'

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

describe('InputManager canvas taps', () => {
  it('fires onTap for a short click without drag', () => {
    /** @type {PointerEvent[]} */
    const taps = []
    const input = new InputManager({
      onAction() {},
      onTap(event) {
        taps.push(event)
      },
    })
    const canvas = {
      listeners: /** @type {Record<string, Function[]>} */ ({}),
      style: {},
      addEventListener(type, fn) {
        ;(this.listeners[type] ||= []).push(fn)
      },
      removeEventListener(type, fn) {
        this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== fn)
      },
      emit(type, event) {
        for (const fn of this.listeners[type] || []) fn(event)
      },
    }
    input.bindCanvas(/** @type {any} */ (canvas))
    canvas.emit('pointerdown', {
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 10,
    })
    canvas.emit('pointerup', {
      pointerId: 1,
      button: 0,
      clientX: 12,
      clientY: 11,
    })
    assert.equal(taps.length, 1)
    input.dispose()
  })

  it('ignores a drag as a tap', () => {
    let taps = 0
    const input = new InputManager({
      onAction() {},
      onTap() {
        taps += 1
      },
    })
    const canvas = {
      listeners: /** @type {Record<string, Function[]>} */ ({}),
      style: {},
      addEventListener(type, fn) {
        ;(this.listeners[type] ||= []).push(fn)
      },
      removeEventListener(type, fn) {
        this.listeners[type] = (this.listeners[type] || []).filter((x) => x !== fn)
      },
      emit(type, event) {
        for (const fn of this.listeners[type] || []) fn(event)
      },
    }
    input.bindCanvas(/** @type {any} */ (canvas))
    canvas.emit('pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 })
    canvas.emit('pointermove', { pointerId: 1, clientX: 40, clientY: 0 })
    canvas.emit('pointerup', { pointerId: 1, button: 0, clientX: 40, clientY: 0 })
    assert.equal(taps, 0)
    input.dispose()
  })
})
