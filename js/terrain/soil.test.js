import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  SOIL_EARTH,
  SOIL_ROCK,
  SOIL_VEGETATION,
  applyHydrometryBias,
  applyPollutionAmount,
  classifySoil,
  countSoilTypes,
  soilColor,
} from './soil.js'

describe('classifySoil', () => {
  it('marks high dry ground as rock', () => {
    assert.equal(classifySoil(0.9, 0.2), SOIL_ROCK)
    assert.equal(classifySoil(0.7, 0.2), SOIL_ROCK)
  })

  it('marks mid wet ground as vegetation', () => {
    assert.equal(classifySoil(0.5, 0.7), SOIL_VEGETATION)
  })

  it('marks the rest as earth', () => {
    assert.equal(classifySoil(0.2, 0.2), SOIL_EARTH)
    assert.equal(classifySoil(0.5, 0.1), SOIL_EARTH)
  })
})

describe('hydrometry / pollution', () => {
  it('shifts moisture around the 0.5 bias', () => {
    assert.ok(applyHydrometryBias(0.5, 1) > 0.8)
    assert.ok(applyHydrometryBias(0.5, 0) < 0.2)
    assert.equal(applyHydrometryBias(0.4, 0.5), 0.4)
  })

  it('scales pollution noise by the global amount', () => {
    assert.equal(applyPollutionAmount(0.8, 0), 0)
    assert.ok(applyPollutionAmount(0.8, 1) > 0.7)
    assert.ok(applyPollutionAmount(0.2, 1) > applyPollutionAmount(0.2, 0.3))
    assert.ok(applyPollutionAmount(1, 1) > applyPollutionAmount(0, 1))
  })
})

describe('soilColor', () => {
  it('makes vegetation greener than earth or rock', () => {
    const veg = soilColor(SOIL_VEGETATION, 0.6, 0)
    const earth = soilColor(SOIL_EARTH, 0.6, 0)
    const rock = soilColor(SOIL_ROCK, 0.2, 0)
    assert.ok(veg[1] > veg[0])
    assert.ok(earth[0] > earth[2])
    assert.ok(Math.abs(rock[0] - rock[1]) < 0.12)
  })

  it('pulls colors toward a sick tint as pollution rises', () => {
    const clean = soilColor(SOIL_VEGETATION, 0.7, 0)
    const dirty = soilColor(SOIL_VEGETATION, 0.7, 1)
    assert.ok(dirty[1] < clean[1])
    assert.ok(dirty[0] > clean[0])
  })
})

describe('countSoilTypes', () => {
  it('ignores cells under water', () => {
    const types = new Uint8Array([SOIL_ROCK, SOIL_EARTH, SOIL_VEGETATION])
    const heights = new Float32Array([1, 5, 5])
    const counts = countSoilTypes(types, heights, 2)
    assert.equal(counts.land, 2)
    assert.equal(counts.rock, 0)
    assert.equal(counts.earth, 1)
    assert.equal(counts.vegetation, 1)
  })
})
