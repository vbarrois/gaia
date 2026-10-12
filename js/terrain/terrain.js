import { createPermutation, fbm2D, lerp } from './perlin.js'
import {
  applyHydrometryBias,
  applyPollutionAmount,
  classifySoil,
  countSoilTypes,
  soilColor,
} from './soil.js'

export const GRID_SIZE = 100

/** @typedef {[number, number, number]} Rgb */

/** @type {{ id: string, maxHeight: number, dry: Rgb, wet: Rgb }[]} */
export const BIOMES = [
  { id: 'sand', maxHeight: 0.38, dry: [0.9, 0.82, 0.52], wet: [0.82, 0.74, 0.46] },
  { id: 'grass', maxHeight: 0.56, dry: [0.62, 0.72, 0.3], wet: [0.34, 0.62, 0.24] },
  { id: 'forest', maxHeight: 0.72, dry: [0.32, 0.5, 0.22], wet: [0.16, 0.4, 0.18] },
  { id: 'rock', maxHeight: 0.86, dry: [0.58, 0.52, 0.46], wet: [0.4, 0.4, 0.42] },
  { id: 'snow', maxHeight: 1.01, dry: [0.94, 0.96, 0.97], wet: [0.84, 0.9, 0.96] },
]

const SHALLOW_WATER = /** @type {Rgb} */ ([0.16, 0.42, 0.55])
const DEEP_WATER = /** @type {Rgb} */ ([0.04, 0.14, 0.3])
const WATER_SURFACE_CLEAN = /** @type {Rgb} */ ([0.165, 0.478, 0.588])
const WATER_SURFACE_POLLUTED = /** @type {Rgb} */ ([0.42, 0.36, 0.08])

const HEIGHT_GAMMA = 1.35
const MOISTURE_OFFSET_X = 17.2
const MOISTURE_OFFSET_Z = -9.4
const POLLUTION_OFFSET_X = 41.7
const POLLUTION_OFFSET_Z = 8.3
const WARP_OFFSET_X = 5.2
const WARP_OFFSET_Z = 1.3

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/**
 * @param {Rgb} a
 * @param {Rgb} b
 * @param {number} t
 * @returns {Rgb}
 */
export function lerpColor(a, b, t) {
  const k = clamp(t, 0, 1)
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]
}

/**
 * Maps a normalized height (0..1) and moisture (0..1) to an RGB triple.
 * @param {number} height01
 * @param {number} moisture01
 * @returns {Rgb}
 */
export function biomeColor(height01, moisture01) {
  const h = clamp(height01, 0, 1)
  const m = clamp(moisture01, 0, 1)
  const biome = BIOMES.find((entry) => h < entry.maxHeight) ?? BIOMES[BIOMES.length - 1]
  return lerpColor(biome.dry, biome.wet, m)
}

/**
 * Color of the translucent water plane, shifted toward murky ochre by pollution.
 * @param {number} pollutionAmount
 * @returns {Rgb}
 */
export function waterSurfaceColor(pollutionAmount) {
  return lerpColor(WATER_SURFACE_CLEAN, WATER_SURFACE_POLLUTED, clamp(pollutionAmount, 0, 1) * 0.85)
}

/**
 * Opacity of the water plane: slightly denser when polluted.
 * @param {number} pollutionAmount
 * @returns {number}
 */
export function waterSurfaceOpacity(pollutionAmount) {
  return 0.38 + clamp(pollutionAmount, 0, 1) * 0.2
}

/**
 * @param {number} height
 * @param {number} waterY
 * @param {number} hydrometry
 * @param {number} amplitude
 * @param {number} [pollution]
 * @returns {Rgb}
 */
export function faceColor(height, waterY, hydrometry, amplitude, pollution = 0) {
  if (height <= waterY) {
    const depth = waterY <= 0 ? 1 : clamp((waterY - height) / waterY, 0, 1)
    const water = lerpColor(SHALLOW_WATER, DEEP_WATER, depth)
    return lerpColor(water, [0.38, 0.32, 0.08], clamp(pollution, 0, 1) * 0.72)
  }
  const t = amplitude <= 0 ? 0 : height / amplitude
  const soilType = classifySoil(t, hydrometry)
  return soilColor(soilType, hydrometry, pollution)
}

/**
 * @typedef {{
 *   size?: number,
 *   seed?: number,
 *   scale?: number,
 *   octaves?: number,
 *   persistence?: number,
 *   lacunarity?: number,
 *   amplitude?: number,
 *   warp?: number,
 *   hydrometry?: number,
 *   pollution?: number,
 *   waterLevel?: number,
 * }} HeightmapOptions
 *
 * @typedef {{
 *   heights: Float32Array,
 *   moisture: Float32Array,
 *   hydrometry: Float32Array,
 *   pollution: Float32Array,
 *   soilType: Uint8Array,
 *   size: number,
 *   amplitude: number,
 *   min: number,
 *   max: number,
 *   seed: number,
 *   soilCounts: { rock: number, earth: number, vegetation: number, land: number },
 * }} Heightmap
 */

/**
 * 100×100 (by default) Perlin-fBm heightmap + moisture field.
 * @param {HeightmapOptions} [options]
 * @returns {Heightmap}
 */
export function generateHeightmap(options = {}) {
  const size = options.size ?? GRID_SIZE
  const seed = options.seed ?? 1
  const scale = options.scale ?? 36
  const octaves = options.octaves ?? 5
  const persistence = options.persistence ?? 0.5
  const lacunarity = options.lacunarity ?? 2.1
  const amplitude = options.amplitude ?? 16
  const warp = options.warp ?? 0.35
  const hydrometryBias = options.hydrometry ?? 0.5
  const pollutionAmount = options.pollution ?? 0.15

  if (size < 2) {
    throw new Error('size must be >= 2')
  }
  if (scale <= 0) {
    throw new Error('scale must be > 0')
  }

  const perm = createPermutation(seed)
  const fbmOptions = { octaves, persistence, lacunarity }
  const moistureOctaves = Math.max(1, octaves - 1)
  const heights = new Float32Array(size * size)
  const moisture = new Float32Array(size * size)
  const hydrometry = new Float32Array(size * size)
  const pollution = new Float32Array(size * size)
  const soilType = new Uint8Array(size * size)
  let min = Infinity
  let max = -Infinity

  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / scale
      const nz = z / scale
      const wx = warp === 0 ? 0 : fbm2D(nx, nz, perm, fbmOptions) * warp
      const wz =
        warp === 0 ? 0 : fbm2D(nx + WARP_OFFSET_X, nz + WARP_OFFSET_Z, perm, fbmOptions) * warp
      const n = fbm2D(nx + wx, nz + wz, perm, fbmOptions)
      const m = fbm2D(nx + MOISTURE_OFFSET_X, nz + MOISTURE_OFFSET_Z, perm, {
        octaves: moistureOctaves,
        persistence,
        lacunarity,
      })
      const p = fbm2D(nx + POLLUTION_OFFSET_X, nz + POLLUTION_OFFSET_Z, perm, {
        octaves: moistureOctaves,
        persistence: 0.55,
        lacunarity,
      })
      const normalized = clamp((n + 1) / 2, 0, 1)
      const height = normalized ** HEIGHT_GAMMA * amplitude
      const idx = z * size + x
      heights[idx] = height
      moisture[idx] = clamp((m + 1) / 2, 0, 1)
      hydrometry[idx] = applyHydrometryBias(moisture[idx], hydrometryBias)
      pollution[idx] = applyPollutionAmount(clamp((p + 1) / 2, 0, 1), pollutionAmount)
      const height01 = amplitude <= 0 ? 0 : height / amplitude
      soilType[idx] = classifySoil(height01, hydrometry[idx])
      const storedHeight = heights[idx]
      if (storedHeight < min) min = storedHeight
      if (storedHeight > max) max = storedHeight
    }
  }

  const waterY = (options.waterLevel ?? 0.2) * amplitude
  return {
    heights,
    moisture,
    hydrometry,
    pollution,
    soilType,
    size,
    amplitude,
    min,
    max,
    seed,
    soilCounts: countSoilTypes(soilType, heights, waterY),
  }
}

/**
 * @typedef {{
 *   positions: Float32Array,
 *   normals: Float32Array,
 *   colors: Float32Array,
 *   triangleCount: number,
 * }} LowPolyMesh
 */

/**
 * Builds a non-indexed triangle soup so each face keeps a unique normal (flat / low-poly).
 * @param {Heightmap} map
 * @param {{ cellSize?: number, waterLevel?: number }} [options]
 * @returns {LowPolyMesh}
 */
export function buildLowPolyTerrain(map, options = {}) {
  const cellSize = options.cellSize ?? 1
  const waterFraction = options.waterLevel ?? 0.32
  const { heights, hydrometry, pollution, size, amplitude } = map
  const waterY = waterFraction * amplitude
  const cells = size - 1
  const triangleCount = cells * cells * 2
  const positions = new Float32Array(triangleCount * 9)
  const normals = new Float32Array(triangleCount * 9)
  const colors = new Float32Array(triangleCount * 9)
  const origin = ((size - 1) * cellSize) / 2
  let offset = 0

  for (let z = 0; z < cells; z += 1) {
    for (let x = 0; x < cells; x += 1) {
      const i00 = z * size + x
      const i10 = z * size + (x + 1)
      const i01 = (z + 1) * size + x
      const i11 = (z + 1) * size + (x + 1)

      const x0 = x * cellSize - origin
      const x1 = (x + 1) * cellSize - origin
      const z0 = z * cellSize - origin
      const z1 = (z + 1) * cellSize - origin

      offset = writeTriangle(
        positions,
        normals,
        colors,
        offset,
        x0,
        heights[i00],
        z0,
        x1,
        heights[i10],
        z0,
        x1,
        heights[i11],
        z1,
        faceColor(
          (heights[i00] + heights[i10] + heights[i11]) / 3,
          waterY,
          (hydrometry[i00] + hydrometry[i10] + hydrometry[i11]) / 3,
          amplitude,
          (pollution[i00] + pollution[i10] + pollution[i11]) / 3,
        ),
        i00,
      )

      offset = writeTriangle(
        positions,
        normals,
        colors,
        offset,
        x0,
        heights[i00],
        z0,
        x1,
        heights[i11],
        z1,
        x0,
        heights[i01],
        z1,
        faceColor(
          (heights[i00] + heights[i11] + heights[i01]) / 3,
          waterY,
          (hydrometry[i00] + hydrometry[i11] + hydrometry[i01]) / 3,
          amplitude,
          (pollution[i00] + pollution[i11] + pollution[i01]) / 3,
        ),
        i01,
      )
    }
  }

  return { positions, normals, colors, triangleCount }
}

/**
 * @param {Float32Array} positions
 * @param {Float32Array} normals
 * @param {Float32Array} colors
 * @param {number} offset
 * @param {number} ax
 * @param {number} ay
 * @param {number} az
 * @param {number} bx
 * @param {number} by
 * @param {number} bz
 * @param {number} cx
 * @param {number} cy
 * @param {number} cz
 * @param {Rgb} color
 * @param {number} salt
 * @returns {number}
 */
function writeTriangle(
  positions,
  normals,
  colors,
  offset,
  ax,
  ay,
  az,
  bx,
  by,
  bz,
  cx,
  cy,
  cz,
  color,
  salt,
) {
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  let nx = uy * vz - uz * vy
  let ny = uz * vx - ux * vz
  let nz = ux * vy - uy * vx
  const len = Math.hypot(nx, ny, nz) || 1
  nx /= len
  ny /= len
  nz /= len

  const jitter = (hash01(salt) - 0.5) * 0.06
  const r = clamp(color[0] + jitter, 0, 1)
  const g = clamp(color[1] + jitter, 0, 1)
  const b = clamp(color[2] + jitter, 0, 1)

  writeVertex(positions, normals, colors, offset, ax, ay, az, nx, ny, nz, r, g, b)
  writeVertex(positions, normals, colors, offset + 3, bx, by, bz, nx, ny, nz, r, g, b)
  writeVertex(positions, normals, colors, offset + 6, cx, cy, cz, nx, ny, nz, r, g, b)
  return offset + 9
}

/**
 * @param {Float32Array} positions
 * @param {Float32Array} normals
 * @param {Float32Array} colors
 * @param {number} offset
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} nx
 * @param {number} ny
 * @param {number} nz
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
function writeVertex(positions, normals, colors, offset, x, y, z, nx, ny, nz, r, g, b) {
  positions[offset] = x
  positions[offset + 1] = y
  positions[offset + 2] = z
  normals[offset] = nx
  normals[offset + 1] = ny
  normals[offset + 2] = nz
  colors[offset] = r
  colors[offset + 1] = g
  colors[offset + 2] = b
}

/**
 * @param {number} n
 * @returns {number}
 */
function hash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * @param {Heightmap} map
 * @param {number} waterFraction
 * @returns {number}
 */
export function waterHeight(map, waterFraction) {
  return waterFraction * map.amplitude
}
