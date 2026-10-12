import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EditorManager } from './EditorManager.js'

describe('EditorManager', () => {
  it('starts in editing mode and commits to playing', () => {
    const editor = new EditorManager({ seed: 10 })
    assert.equal(editor.editing, true)
    editor.commit()
    assert.equal(editor.playing, true)
    assert.equal(editor.draft.seed, 10)
  })

  it('cancel restores snapshot after enterEditor with a game', () => {
    const editor = new EditorManager({ seed: 1, amplitude: 20 })
    editor.commit()
    editor.enterEditor(true)
    editor.updateDraft({ amplitude: 40 })
    assert.equal(editor.draft.amplitude, 40)
    const { restored, draft } = editor.cancel()
    assert.equal(restored, true)
    assert.equal(draft.amplitude, 20)
    assert.equal(editor.playing, true)
  })

  it('applies presets without losing seed', () => {
    const editor = new EditorManager({ seed: 99 })
    editor.applyPreset('montagnes')
    assert.equal(editor.draft.seed, 99)
    assert.ok(editor.draft.amplitude > 30)
  })

  it('round-trips export/import JSON', () => {
    const editor = new EditorManager({ seed: 55, falloff: 10 })
    const json = editor.exportJson()
    const other = new EditorManager()
    other.importJson(json)
    assert.equal(other.draft.seed, 55)
    assert.equal(other.draft.falloff, 10)
  })
})
