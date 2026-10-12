import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { World } from '../world/World.js'
import { collectTreePlacements } from './trees.js'

describe('collectTreePlacements', () => {
  it('is deterministic and skips water cells', () => {
    const world = new World({ seed: 7429 })
    const a = collectTreePlacements(world)
    const b = collectTreePlacements(world)
    assert.equal(a.length, b.length)
    assert.ok(a.length > 0)
    assert.equal(a.length, world.stats().trees)
    for (const t of a) {
      assert.ok(t.y >= world.config.water + 0.25)
    }
  })
})
