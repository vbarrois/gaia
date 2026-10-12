import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildLowPolyClouds, generateCloudField } from './clouds.js'

describe('generateCloudField', () => {
  it('is deterministic and stays in 0..1', () => {
    const a = generateCloudField({ seed: 3, size: 16, coverage: 0.5, altitude: 20 })
    const b = generateCloudField({ seed: 3, size: 16, coverage: 0.5, altitude: 20 })
    assert.deepEqual(Array.from(a.coverage), Array.from(b.coverage))
    assert.equal(a.altitude, 20)
    for (const v of a.coverage) {
      assert.ok(v >= 0 && v <= 1)
    }
  })

  it('raises the threshold when coverage drops', () => {
    const dense = generateCloudField({ seed: 1, size: 12, coverage: 0.9 })
    const sparse = generateCloudField({ seed: 1, size: 12, coverage: 0.1 })
    assert.ok(sparse.threshold > dense.threshold)
  })

  it('fades coverage on the domain border', () => {
    const field = generateCloudField({ seed: 4, size: 24, coverage: 0.9 })
    const last = field.size - 1
    assert.ok(field.coverage[0] < 0.05)
    assert.ok(field.coverage[last] < 0.05)
    assert.ok(field.coverage[last * field.size] < 0.05)
  })
})

describe('buildLowPolyClouds', () => {
  it('emits triangles only for cloudy cells', () => {
    const field = generateCloudField({ seed: 8, size: 10, coverage: 0.5, altitude: 22 })
    const mesh = buildLowPolyClouds(field, { worldSize: 99 })
    assert.ok(mesh.triangleCount > 0)
    assert.ok(mesh.triangleCount < 9 * 9 * 2)
    assert.equal(mesh.positions.length, mesh.triangleCount * 9)
    let minY = Infinity
    for (let i = 1; i < mesh.positions.length; i += 3) {
      minY = Math.min(minY, mesh.positions[i])
    }
    assert.ok(minY >= 22 - 0.01)
  })
})
