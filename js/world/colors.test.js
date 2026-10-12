import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildRainOutline, buildWorldMesh, paintFieldImage, terrainColor } from './colors.js'
import { World } from './World.js'

describe('terrainColor / buildWorldMesh', () => {
  it('builds an indexed mesh for the configured resolution', () => {
    const world = new World({ seed: 7, resolution: 32 })
    const mesh = buildWorldMesh(world, 'natural')
    assert.equal(mesh.positions.length, 33 * 33 * 3)
    assert.equal(mesh.triangleCount, 32 * 32 * 2)
    assert.equal(mesh.indices.length, mesh.triangleCount * 3)
  })

  it('returns distinct layer palettes', () => {
    const world = new World({ seed: 7 })
    const natural = terrainColor(world, 0, 0, world.height(0, 0), 'natural')
    const perlin = terrainColor(world, 0, 0, world.height(0, 0), 'perlin')
    const rain = terrainColor(world, 0, 0, world.height(0, 0), 'rain')
    assert.notDeepEqual(natural, perlin)
    assert.notDeepEqual(natural, rain)
    assert.equal(perlin[0], perlin[1])
  })

  it('builds a rain outline with segment vertices', () => {
    const world = new World({ seed: 7429, resolution: 48 })
    const mesh = buildWorldMesh(world, 'natural')
    const outline = buildRainOutline(world, mesh.positions, mesh.indices)
    assert.equal(outline.length % 6, 0)
    assert.ok(outline.length >= 6)
  })

  it('paints a rain field image', () => {
    const world = new World({ seed: 3, resolution: 32 })
    const image = { width: 16, height: 16, data: new Uint8ClampedArray(16 * 16 * 4) }
    paintFieldImage(world, 'rain', /** @type {ImageData} */ (image))
    assert.ok(image.data.some((v, i) => i % 4 !== 3 && v > 0))
  })
})
