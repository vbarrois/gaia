import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PANEL_STORAGE_KEY,
  readPanelCollapsed,
  writePanelCollapsed,
} from './panel.js'

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
  }
}

describe('readPanelCollapsed', () => {
  it('collapses on a phone-sized viewport when nothing is stored', () => {
    assert.equal(readPanelCollapsed(memoryStorage(), 390), true)
  })

  it('stays open on desktop when nothing is stored', () => {
    assert.equal(readPanelCollapsed(memoryStorage(), 1280), false)
  })

  it('honors a stored preference over viewport size', () => {
    const collapsed = memoryStorage({ [PANEL_STORAGE_KEY]: '1' })
    const expanded = memoryStorage({ [PANEL_STORAGE_KEY]: '0' })
    assert.equal(readPanelCollapsed(collapsed, 1280), true)
    assert.equal(readPanelCollapsed(expanded, 390), false)
  })
})

describe('writePanelCollapsed', () => {
  it('persists 1 / 0', () => {
    const storage = memoryStorage()
    writePanelCollapsed(storage, true)
    assert.equal(storage.getItem(PANEL_STORAGE_KEY), '1')
    writePanelCollapsed(storage, false)
    assert.equal(storage.getItem(PANEL_STORAGE_KEY), '0')
  })
})
