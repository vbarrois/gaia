import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { World } from '../world/World.js'
import { ActionManager } from './ActionManager.js'

describe('ActionManager', () => {
  it('clamps brush radius and applies clean', () => {
    const actions = new ActionManager()
    assert.equal(actions.setRadius(100), 16)
    assert.equal(actions.setRadius(1), 3)
    actions.setTool('clean')
    const world = new World({ seed: 7429, pollution: 80 })
    const cell = world.cells.find((c) => !c.wet && c.pollution > 10)
    assert.ok(cell)
    const result = actions.apply(world, cell.px, cell.pz)
    assert.equal(result.ok, true)
  })
})
