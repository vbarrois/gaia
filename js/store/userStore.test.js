import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PANEL_STORAGE_KEY } from '../ui/panel.js'
import {
  USER_DEFAULTS,
  USER_STORAGE_KEY,
  clampUserNumber,
  clearUserData,
  loadUserData,
  sanitizeUserData,
  sanitizeVec3,
  saveUserData,
  USER_LIMITS,
} from './userStore.js'

function memoryStorage(initial = {}) {
  /** @type {Record<string, string>} */
  const data = { ...initial }
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      data[key] = String(value)
    },
    removeItem(key) {
      delete data[key]
    },
  }
}

describe('clampUserNumber', () => {
  it('falls back on NaN and clamps to limits', () => {
    assert.equal(clampUserNumber('nope', USER_LIMITS.octaves, 5), 5)
    assert.equal(clampUserNumber(99, USER_LIMITS.octaves, 5), 8)
    assert.equal(clampUserNumber(0, USER_LIMITS.octaves, 5), 1)
    assert.equal(clampUserNumber(3.9, USER_LIMITS.octaves, 5), 3)
  })
})

describe('sanitizeVec3', () => {
  it('accepts three finite numbers and rejects the rest', () => {
    assert.deepEqual(sanitizeVec3([1, 2, 3], null), [1, 2, 3])
    assert.deepEqual(sanitizeVec3([1, 2], [0, 0, 0]), [0, 0, 0])
    assert.deepEqual(sanitizeVec3(['x', 1, 2], [0, 0, 0]), [0, 0, 0])
    assert.equal(sanitizeVec3([1, 2]), null)
  })
})

describe('sanitizeUserData', () => {
  it('returns defaults for junk input', () => {
    const empty = sanitizeUserData(null)
    assert.equal(empty.seed, USER_DEFAULTS.seed)
    assert.equal(empty.hydrometry, USER_DEFAULTS.hydrometry)
    assert.equal(empty.pollution, USER_DEFAULTS.pollution)
    assert.equal(empty.cloudAltitude, USER_DEFAULTS.cloudAltitude)
    assert.equal(empty.cloudCoverage, USER_DEFAULTS.cloudCoverage)
    assert.equal(empty.wireframe, false)
    assert.equal(empty.muted, false)
    assert.equal(empty.panelCollapsed, null)
    assert.equal(empty.camera, null)
  })

  it('keeps a valid payload and drops extras', () => {
    const data = sanitizeUserData({
      seed: 42,
      scale: 30,
      octaves: 4,
      persistence: 0.4,
      lacunarity: 2,
      amplitude: 18,
      warp: 0.2,
      waterLevel: 0.1,
      hydrometry: 0.8,
      pollution: 0.9,
      cloudAltitude: 40,
      cloudCoverage: 0.6,
      wireframe: true,
      muted: true,
      panelCollapsed: false,
      evil: 'nope',
    })
    assert.equal(data.seed, 42)
    assert.equal(data.hydrometry, 0.8)
    assert.equal(data.pollution, 0.9)
    assert.equal(data.cloudAltitude, 40)
    assert.equal(data.cloudCoverage, 0.6)
    assert.equal(data.wireframe, true)
    assert.equal(data.muted, true)
    assert.equal(data.panelCollapsed, false)
    assert.equal('evil' in data, false)
  })
})

describe('loadUserData / saveUserData', () => {
  it('round-trips through JSON in localStorage', () => {
    const storage = memoryStorage()
    saveUserData(storage, { seed: 77, wireframe: true, panelCollapsed: true })
    const loaded = loadUserData(storage, 1280)
    assert.equal(loaded.seed, 77)
    assert.equal(loaded.wireframe, true)
    assert.equal(loaded.panelCollapsed, true)
    assert.ok(storage.getItem(USER_STORAGE_KEY)?.includes('"seed":77'))
  })

  it('uses the viewport default when no panel preference exists', () => {
    const phone = loadUserData(memoryStorage(), 390)
    const desktop = loadUserData(memoryStorage(), 1280)
    assert.equal(phone.panelCollapsed, true)
    assert.equal(desktop.panelCollapsed, false)
  })

  it('migrates the leftover panel key if the blob has no preference', () => {
    const storage = memoryStorage({ [PANEL_STORAGE_KEY]: '0' })
    const loaded = loadUserData(storage, 390)
    assert.equal(loaded.panelCollapsed, false)
  })

  it('ignores broken JSON', () => {
    const storage = memoryStorage({ [USER_STORAGE_KEY]: '{not-json' })
    const loaded = loadUserData(storage, 1280)
    assert.equal(loaded.seed, USER_DEFAULTS.seed)
  })
})

describe('clearUserData', () => {
  it('removes the user blob and the legacy panel key', () => {
    const storage = memoryStorage({
      [USER_STORAGE_KEY]: '{}',
      [PANEL_STORAGE_KEY]: '1',
    })
    clearUserData(storage)
    assert.equal(storage.getItem(USER_STORAGE_KEY), null)
    assert.equal(storage.getItem(PANEL_STORAGE_KEY), null)
  })
})
