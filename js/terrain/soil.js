import { lerp } from './perlin.js'

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * @param {Rgb} a
 * @param {Rgb} b
 * @param {number} t
 * @returns {Rgb}
 */
function lerpColor(a, b, t) {
  const k = clamp(t, 0, 1)
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]
}

/** @typedef {[number, number, number]} Rgb */

export const SOIL_ROCK = 0
export const SOIL_EARTH = 1
export const SOIL_VEGETATION = 2

export const SOIL_IDS = /** @type {const} */ (['rock', 'earth', 'vegetation'])

const ROCK_DRY = /** @type {Rgb} */ ([0.56, 0.52, 0.48])
const ROCK_WET = /** @type {Rgb} */ ([0.38, 0.38, 0.4])
const EARTH_DRY = /** @type {Rgb} */ ([0.62, 0.46, 0.28])
const EARTH_WET = /** @type {Rgb} */ ([0.36, 0.28, 0.16])
const VEG_DRY = /** @type {Rgb} */ ([0.5, 0.62, 0.26])
const VEG_WET = /** @type {Rgb} */ ([0.16, 0.42, 0.18])
const POLLUTED = /** @type {Rgb} */ ([0.58, 0.36, 0.08])

/**
 * Hydrometry from raw moisture and a 0..1 bias (0.5 = natural).
 * @param {number} moisture
 * @param {number} bias
 * @returns {number}
 */
export function applyHydrometryBias(moisture, bias) {
  return clamp(moisture + (bias - 0.5) * 0.85, 0, 1)
}

/**
 * @param {number} noise01
 * @param {number} amount 0 = clean, 1 = fully polluted
 * @returns {number}
 */
export function applyPollutionAmount(noise01, amount) {
  const a = clamp(amount, 0, 1)
  const n = clamp(noise01, 0, 1)
  return clamp(a * (0.4 + n * 0.6), 0, 1)
}

/**
 * @param {number} height01
 * @param {number} hydrometry
 * @returns {typeof SOIL_ROCK | typeof SOIL_EARTH | typeof SOIL_VEGETATION}
 */
export function classifySoil(height01, hydrometry) {
  const h = clamp(height01, 0, 1)
  const w = clamp(hydrometry, 0, 1)
  if (h >= 0.82 || (h >= 0.66 && w < 0.42)) return SOIL_ROCK
  if (h >= 0.34 && h < 0.78 && w >= 0.38) return SOIL_VEGETATION
  return SOIL_EARTH
}

/**
 * @param {number} soilType
 * @param {number} hydrometry
 * @param {number} pollution
 * @returns {Rgb}
 */
export function soilColor(soilType, hydrometry, pollution) {
  const wet = clamp(hydrometry, 0, 1)
  let base = lerpColor(EARTH_DRY, EARTH_WET, wet)
  if (soilType === SOIL_ROCK) base = lerpColor(ROCK_DRY, ROCK_WET, wet)
  if (soilType === SOIL_VEGETATION) base = lerpColor(VEG_DRY, VEG_WET, wet)
  return lerpColor(base, POLLUTED, clamp(pollution, 0, 1))
}

/**
 * @param {Uint8Array} soilTypes
 * @param {Float32Array} heights
 * @param {number} waterY
 * @returns {{ rock: number, earth: number, vegetation: number, land: number }}
 */
export function countSoilTypes(soilTypes, heights, waterY) {
  let rock = 0
  let earth = 0
  let vegetation = 0
  let land = 0
  for (let i = 0; i < soilTypes.length; i += 1) {
    if (heights[i] <= waterY) continue
    land += 1
    if (soilTypes[i] === SOIL_ROCK) rock += 1
    else if (soilTypes[i] === SOIL_VEGETATION) vegetation += 1
    else earth += 1
  }
  return { rock, earth, vegetation, land }
}
