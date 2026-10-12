import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifySoil } from './soil.js'
import {
  BIOMES,
  GRID_SIZE,
  biomeColor,
  buildLowPolyTerrain,
  clamp,
  faceColor,
  generateHeightmap,
  lerpColor,
  waterHeight,
  waterSurfaceColor,
  waterSurfaceOpacity,
} from './terrain.js'

describe('clamp / lerpColor', () => {
  it('clamps to the given range', () => {
    assert.equal(clamp(-1, 0, 1), 0)
    assert.equal(clamp(2, 0, 1), 1)
    assert.equal(clamp(0.4, 0, 1), 0.4)
  })

  it('interpolates RGB channels', () => {
    assert.deepEqual(lerpColor([0, 0, 0], [1, 0.5, 0], 0.5), [0.5, 0.25, 0])
  })
})

describe('biomeColor', () => {
  it('picks the sand / grass / snow bands from height', () => {
    const sand = biomeColor(0.33, 0)
    const grass = biomeColor(0.45, 0)
    const snow = biomeColor(0.95, 0)
    assert.deepEqual(sand, BIOMES[0].dry)
    assert.deepEqual(grass, BIOMES[1].dry)
    assert.deepEqual(snow, BIOMES[4].dry)
  })

  it('leans toward the wet palette as moisture rises', () => {
    const dry = biomeColor(0.45, 0)
    const wet = biomeColor(0.45, 1)
    assert.deepEqual(dry, BIOMES[1].dry)
    assert.deepEqual(wet, BIOMES[1].wet)
  })
})

describe('faceColor', () => {
  it('uses water colors below the water line', () => {
    const shallow = faceColor(1.9, 2, 0.5, 10)
    const earth = faceColor(5, 2, 0, 10)
    assert.ok(shallow[2] > shallow[0])
    assert.ok(earth[0] > earth[2])
  })

  it('tints land with vegetation when hydrometry is high', () => {
    const veg = faceColor(5, 2, 0.8, 10)
    const earth = faceColor(5, 2, 0.1, 10)
    assert.ok(veg[1] > veg[0])
    assert.ok(earth[0] > earth[1])
  })

  it('sicks water and land as pollution rises', () => {
    const clean = faceColor(5, 2, 0.8, 10, 0)
    const dirty = faceColor(5, 2, 0.8, 10, 1)
    assert.ok(dirty[1] < clean[1])
    const dirtyWater = faceColor(1, 2, 0.5, 10, 1)
    const cleanWater = faceColor(1, 2, 0.5, 10, 0)
    assert.ok(dirtyWater[0] > cleanWater[0])
    assert.ok(dirtyWater[2] < cleanWater[2])
  })
})

describe('generateHeightmap', () => {
  it('builds a 100×100 grid by default', () => {
    const map = generateHeightmap({ seed: 1, octaves: 2 })
    assert.equal(map.size, GRID_SIZE)
    assert.equal(map.heights.length, GRID_SIZE * GRID_SIZE)
    assert.equal(map.moisture.length, GRID_SIZE * GRID_SIZE)
    assert.equal(map.hydrometry.length, GRID_SIZE * GRID_SIZE)
    assert.equal(map.pollution.length, GRID_SIZE * GRID_SIZE)
    assert.equal(map.soilType.length, GRID_SIZE * GRID_SIZE)
  })

  it('is deterministic for a seed and differs for another', () => {
    const a = generateHeightmap({ seed: 21, octaves: 3, size: 16 })
    const b = generateHeightmap({ seed: 21, octaves: 3, size: 16 })
    const c = generateHeightmap({ seed: 22, octaves: 3, size: 16 })
    assert.deepEqual(Array.from(a.heights), Array.from(b.heights))
    assert.notDeepEqual(Array.from(a.heights), Array.from(c.heights))
  })

  it('keeps heights in [0, amplitude] and tracks min/max', () => {
    const amplitude = 12
    const map = generateHeightmap({ seed: 4, size: 24, amplitude, octaves: 4 })
    assert.ok(map.min >= 0)
    assert.ok(map.max <= amplitude)
    assert.equal(map.min, Math.min(...map.heights))
    assert.equal(map.max, Math.max(...map.heights))
  })

  it('rejects invalid size and scale', () => {
    assert.throws(() => generateHeightmap({ size: 1 }), /size/)
    assert.throws(() => generateHeightmap({ scale: 0 }), /scale/)
  })

  it('domain warp changes the field', () => {
    const opts = { seed: 9, size: 12, octaves: 3 }
    const flat = generateHeightmap({ ...opts, warp: 0 })
    const warped = generateHeightmap({ ...opts, warp: 0.4 })
    assert.notDeepEqual(Array.from(flat.heights), Array.from(warped.heights))
  })

  it('grows more vegetation when hydrometry bias is high', () => {
    const opts = { seed: 7, size: 40, octaves: 3, waterLevel: 0 }
    const dry = generateHeightmap({ ...opts, hydrometry: 0 })
    const wet = generateHeightmap({ ...opts, hydrometry: 1 })
    assert.ok(wet.soilCounts.vegetation > dry.soilCounts.vegetation)
    assert.ok(dry.soilCounts.rock + dry.soilCounts.earth + dry.soilCounts.vegetation === dry.soilCounts.land)
  })

  it('zeros pollution when the amount is 0', () => {
    const map = generateHeightmap({ seed: 3, size: 16, octaves: 2, pollution: 0 })
    assert.ok([...map.pollution].every((value) => value === 0))
  })

  it('classifies soil from the rendered height, not the pre-gamma noise', () => {
    const map = generateHeightmap({ seed: 11, size: 20, octaves: 2, amplitude: 10, hydrometry: 0.5 })
    for (let i = 0; i < map.soilType.length; i += 1) {
      const height01 = map.heights[i] / map.amplitude
      assert.equal(map.soilType[i], classifySoil(height01, map.hydrometry[i]))
    }
  })
})

describe('buildLowPolyTerrain', () => {
  it('emits two triangles per cell with matching attribute lengths', () => {
    const map = generateHeightmap({ seed: 5, size: 8, octaves: 2 })
    const mesh = buildLowPolyTerrain(map, { cellSize: 1, waterLevel: 0.3 })
    const cells = 7
    assert.equal(mesh.triangleCount, cells * cells * 2)
    assert.equal(mesh.positions.length, mesh.triangleCount * 9)
    assert.equal(mesh.normals.length, mesh.triangleCount * 9)
    assert.equal(mesh.colors.length, mesh.triangleCount * 9)
  })

  it('writes unit-ish normals and colors in 0..1', () => {
    const map = generateHeightmap({ seed: 2, size: 6, octaves: 2 })
    const mesh = buildLowPolyTerrain(map)
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const len = Math.hypot(mesh.normals[i], mesh.normals[i + 1], mesh.normals[i + 2])
      assert.ok(Math.abs(len - 1) < 1e-5)
    }
    for (let i = 0; i < mesh.colors.length; i += 1) {
      assert.ok(mesh.colors[i] >= 0 && mesh.colors[i] <= 1)
    }
  })

  it('centers the grid around the origin', () => {
    const map = generateHeightmap({ seed: 1, size: 5, octaves: 1, amplitude: 0, warp: 0 })
    const mesh = buildLowPolyTerrain(map, { cellSize: 1 })
    let minX = Infinity
    let maxX = -Infinity
    for (let i = 0; i < mesh.positions.length; i += 3) {
      minX = Math.min(minX, mesh.positions[i])
      maxX = Math.max(maxX, mesh.positions[i])
    }
    assert.equal(minX, -2)
    assert.equal(maxX, 2)
  })
})

describe('waterHeight', () => {
  it('scales the water fraction by amplitude', () => {
    const map = generateHeightmap({ seed: 1, size: 4, amplitude: 20, octaves: 1 })
    assert.equal(waterHeight(map, 0.25), 5)
  })
})

describe('waterSurfaceColor', () => {
  it('shifts from teal toward murky ochre as pollution rises', () => {
    const clean = waterSurfaceColor(0)
    const dirty = waterSurfaceColor(1)
    assert.ok(dirty[0] > clean[0])
    assert.ok(dirty[2] < clean[2])
    assert.ok(waterSurfaceOpacity(1) > waterSurfaceOpacity(0))
  })
})
