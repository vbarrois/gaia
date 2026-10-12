import { clamp } from './math.js'

export const SIZE = 120
export const GRID = 36
export const CELL = SIZE / GRID
export const RAIN_AT = 0.56
export const ECO_GOAL = 65
/** Real-time seconds per simulation day at 1× (matches Gaya). */
export const DAY_SECONDS = 8

export const DEFAULTS = {
  seed: 7429,
  amplitude: 26,
  scale: 57,
  octaves: 4,
  persistence: 0.48,
  water: 3,
  falloff: 72,
  warp: 12,
  resolution: 64,
  pollution: 58,
  wireframe: false,
}

export const PRESETS = {
  collines: {
    amplitude: 20,
    scale: 76,
    octaves: 3,
    persistence: 0.4,
    water: 2,
    falloff: 55,
    warp: 10,
  },
  archipel: {
    amplitude: 21,
    scale: 32,
    octaves: 4,
    persistence: 0.47,
    water: 9,
    falloff: 80,
    warp: 10,
  },
  montagnes: {
    amplitude: 43,
    scale: 64,
    octaves: 5,
    persistence: 0.54,
    water: -2,
    falloff: 38,
    warp: 19,
  },
  vallee: {
    amplitude: 27,
    scale: 102,
    octaves: 4,
    persistence: 0.43,
    water: 5,
    falloff: 0,
    warp: 26,
  },
}

const LIMITS = [
  ['seed', 1, 999999],
  ['amplitude', 0, 48],
  ['scale', 18, 120],
  ['octaves', 1, 7],
  ['persistence', 0.2, 0.8],
  ['water', -14, 22],
  ['falloff', 0, 100],
  ['warp', 0, 35],
  ['resolution', 32, 128],
  ['pollution', 0, 100],
]

/**
 * @typedef {typeof DEFAULTS} WorldConfig
 */

/**
 * @param {Partial<WorldConfig>} [config]
 * @returns {WorldConfig}
 */
export function sanitize(config = {}) {
  const c = { ...DEFAULTS, ...config }
  for (const [key, min, max] of LIMITS) {
    const raw = +c[key]
    const ok = raw === raw && raw !== Infinity && raw !== -Infinity
    c[key] = clamp(ok ? raw : DEFAULTS[key], min, max)
  }
  c.seed = Math.round(c.seed)
  c.octaves = Math.round(c.octaves)
  c.resolution = Math.round(c.resolution / 16) * 16
  c.wireframe = !!c.wireframe
  return c
}

/**
 * @param {string} name
 * @param {Partial<WorldConfig>} [base]
 * @returns {WorldConfig}
 */
export function applyPreset(name, base = {}) {
  const preset = PRESETS[name]
  if (!preset) return sanitize(base)
  return sanitize({ ...base, ...preset })
}
