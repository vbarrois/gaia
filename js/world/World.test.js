import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GRID } from './config.js'
import { World } from './World.js'

describe('World', () => {
  it('builds a deterministic 36×36 grid for a seed', () => {
    const a = new World({ seed: 7429, resolution: 32 })
    const b = new World({ seed: 7429, resolution: 32 })
    assert.equal(a.cells.length, GRID * GRID)
    assert.equal(a.stats().score, b.stats().score)
    assert.equal(a.height(0, 0), b.height(0, 0))
    assert.equal(a.cells[10].pollution, b.cells[10].pollution)
  })

  it('places a dry source and softens the oasis', () => {
    const w = new World({ seed: 7429 })
    assert.ok(w.source)
    const near = w.cellAt(w.source.x, w.source.z)
    assert.equal(near.wet, false)
  })

  it('step advances day and regenerates energy', () => {
    const w = new World({ seed: 100 })
    w.energy = 40
    const before = w.stats().score
    w.step()
    assert.equal(w.day, 2)
    assert.ok(w.energy > 40)
    assert.equal(typeof w.stats().score, 'number')
    assert.ok(Number.isFinite(before))
  })

  it('clean action spends energy and isolates waste', () => {
    const w = new World({ seed: 7429, pollution: 80 })
    const cell = w.cells.find((c) => !c.wet && c.pollution > 20)
    assert.ok(cell)
    const energyBefore = w.energy
    const result = w.act('clean', cell.px, cell.pz, 8)
    assert.equal(result.ok, true)
    assert.ok(w.energy < energyBefore)
    assert.ok(w.waste > 0)
  })

  it('purify requires water or source proximity', () => {
    const w = new World({ seed: 7429 })
    const dry = w.cells.find((c) => !c.wet && Math.hypot(c.px - w.source.x, c.pz - w.source.z) > 12)
    assert.ok(dry)
    const fail = w.act('purify', dry.px, dry.pz, 3)
    assert.equal(fail.ok, false)
    const wet = w.cells.find((c) => c.wet)
    if (wet) {
      const ok = w.act('purify', wet.px, wet.pz, 3)
      assert.equal(ok.ok, true)
      assert.ok(w.water > 80)
    }
  })

  it('different seeds diverge', () => {
    const a = new World({ seed: 1 })
    const b = new World({ seed: 2 })
    assert.notEqual(a.height(3, 7), b.height(3, 7))
  })

  it('rain field drifts smoothly with wind over time', () => {
    const w = new World({ seed: 7429 })
    const before = w.rainField(0, 0)
    w.driftWeather(1 / 60, 3)
    w.driftWeather(1 / 60, 3)
    assert.ok(w.rainTime > 0)
    assert.ok(Math.hypot(w.rainOffsetX, w.rainOffsetZ) > 0)
    assert.notEqual(w.rainField(0, 0), before)
    const angleBefore = w.windAngle
    w.windAngleTarget = angleBefore + 1.2
    w.driftWeather(0.5, 1)
    // Se rapproche de la cible sans y sauter d’un coup.
    assert.notEqual(w.windAngle, angleBefore)
    assert.ok(Math.abs(w.windAngle - w.windAngleTarget) < Math.abs(angleBefore - w.windAngleTarget))
    assert.ok(Math.abs(w.windAngle - w.windAngleTarget) > 0.01)
    w.step()
    assert.ok(Number.isFinite(w.windAngleTarget))
  })
})
