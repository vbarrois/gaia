import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createPermutation,
  fade,
  fbm2D,
  grad,
  lerp,
  mulberry32,
  noise2D,
} from './perlin.js'

describe('fade', () => {
  it('maps 0 to 0 and 1 to 1', () => {
    assert.equal(fade(0), 0)
    assert.equal(fade(1), 1)
  })

  it('is 0.5 at t = 0.5 (smoothstep midpoint)', () => {
    assert.equal(fade(0.5), 0.5)
  })
})

describe('lerp', () => {
  it('returns endpoints and the midpoint', () => {
    assert.equal(lerp(0, 10, 0), 0)
    assert.equal(lerp(0, 10, 1), 10)
    assert.equal(lerp(0, 10, 0.5), 5)
  })
})

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    assert.deepEqual([a(), a(), a()], [b(), b(), b()])
  })

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i += 1) {
      const value = rng()
      assert.ok(value >= 0 && value < 1)
    }
  })
})

describe('grad', () => {
  it('picks one of the four diagonal directions', () => {
    assert.equal(grad(0, 1, 2), 3)
    assert.equal(grad(1, 1, 2), 1)
    assert.equal(grad(2, 1, 2), 1)
    assert.equal(grad(3, 1, 2), -3)
  })
})

describe('createPermutation', () => {
  it('contains every byte exactly twice (512 = two copies of 0..255)', () => {
    const p = createPermutation(1)
    assert.equal(p.length, 512)
    const counts = new Uint16Array(256)
    for (let i = 0; i < 512; i += 1) {
      counts[p[i]] += 1
    }
    for (let i = 0; i < 256; i += 1) {
      assert.equal(counts[i], 2)
    }
  })

  it('is stable for the same seed and differs for another seed', () => {
    const a = createPermutation(99)
    const b = createPermutation(99)
    const c = createPermutation(100)
    assert.deepEqual(Array.from(a), Array.from(b))
    assert.notDeepEqual(Array.from(a), Array.from(c))
  })
})

describe('noise2D', () => {
  it('is deterministic', () => {
    const p = createPermutation(12)
    assert.equal(noise2D(0.3, 0.7, p), noise2D(0.3, 0.7, p))
  })

  it('stays within a Perlin-like range on a sampled grid', () => {
    const p = createPermutation(3)
    let min = Infinity
    let max = -Infinity
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const n = noise2D(x * 0.17, y * 0.13, p)
        min = Math.min(min, n)
        max = Math.max(max, n)
      }
    }
    assert.ok(min >= -1.5 && max <= 1.5)
    assert.ok(min < 0 && max > 0)
  })
})

describe('fbm2D', () => {
  it('returns 0 when octaves < 1', () => {
    const p = createPermutation(1)
    assert.equal(fbm2D(0.2, 0.4, p, { octaves: 0 }), 0)
  })

  it('changes when octaves increase', () => {
    const p = createPermutation(8)
    const one = fbm2D(1.1, 2.2, p, { octaves: 1 })
    const five = fbm2D(1.1, 2.2, p, { octaves: 5 })
    assert.notEqual(one, five)
  })
})
