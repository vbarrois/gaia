import { createPermutation, fbm2D } from './perlin.js'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export const CLOUD_GRID = 48

/**
 * @typedef {{
 *   coverage: Float32Array,
 *   size: number,
 *   altitude: number,
 *   threshold: number,
 * }} CloudField
 */

/**
 * @param {{
 *   size?: number,
 *   seed?: number,
 *   scale?: number,
 *   coverage?: number,
 *   altitude?: number,
 *   offsetX?: number,
 *   offsetZ?: number,
 * }} [options]
 * @returns {CloudField}
 */
export function generateCloudField(options = {}) {
  const size = options.size ?? CLOUD_GRID
  const seed = (options.seed ?? 1) + 911
  const scale = options.scale ?? 18
  const coverage = clamp(options.coverage ?? 0.42, 0, 1)
  const altitude = options.altitude ?? 24
  const offsetX = options.offsetX ?? 0
  const offsetZ = options.offsetZ ?? 0
  if (size < 2) throw new Error('cloud size must be >= 2')

  const perm = createPermutation(seed)
  const values = new Float32Array(size * size)
  const threshold = 1 - coverage * 0.92
  const last = size - 1
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      // Même convention que la pluie : (x - offset) → dérive dans le sens du vent.
      const n = fbm2D((x - offsetX) / scale, (z - offsetZ) / scale, perm, {
        octaves: 4,
        persistence: 0.55,
        lacunarity: 2.1,
      })
      let v = clamp((n + 1) / 2, 0, 1)
      // Falloff fort sur les bords : évite la silhouette rectangulaire du tapis.
      const edge = Math.min(x, z, last - x, last - z) / Math.max(1, last * 0.22)
      const fade = edge >= 1 ? 1 : edge * edge * (3 - 2 * edge)
      values[z * size + x] = v * fade
    }
  }
  return { coverage: values, size, altitude, threshold }
}

/**
 * Low-poly cloud sheet: only cloudy cells become triangles.
 * @param {CloudField} field
 * @param {{ worldSize?: number }} [options]
 * @returns {{ positions: Float32Array, normals: Float32Array, colors: Float32Array, triangleCount: number }}
 */
export function buildLowPolyClouds(field, options = {}) {
  const worldSize = options.worldSize ?? 99
  const { coverage, size, altitude, threshold } = field
  const step = worldSize / (size - 1)
  const origin = worldSize / 2
  /** @type {number[]} */
  const pos = []
  /** @type {number[]} */
  const nrm = []
  /** @type {number[]} */
  const col = []

  const cloudy = (x, z) => coverage[z * size + x] > threshold

  for (let z = 0; z < size - 1; z += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      if (!cloudy(x, z) && !cloudy(x + 1, z) && !cloudy(x, z + 1) && !cloudy(x + 1, z + 1)) {
        continue
      }
      const h00 = altitude + Math.max(0, coverage[z * size + x] - threshold) * 7
      const h10 = altitude + Math.max(0, coverage[z * size + (x + 1)] - threshold) * 7
      const h01 = altitude + Math.max(0, coverage[(z + 1) * size + x] - threshold) * 7
      const h11 = altitude + Math.max(0, coverage[(z + 1) * size + (x + 1)] - threshold) * 7
      const x0 = x * step - origin
      const x1 = (x + 1) * step - origin
      const z0 = z * step - origin
      const z1 = (z + 1) * step - origin
      const alpha = 0.55 + coverage[z * size + x] * 0.25
      pushCloudTri(pos, nrm, col, x0, h00, z0, x1, h10, z0, x1, h11, z1, alpha)
      pushCloudTri(pos, nrm, col, x0, h00, z0, x1, h11, z1, x0, h01, z1, alpha)
    }
  }

  return {
    positions: new Float32Array(pos),
    normals: new Float32Array(nrm),
    colors: new Float32Array(col),
    triangleCount: pos.length / 9,
  }
}

/**
 * @param {number[]} pos
 * @param {number[]} nrm
 * @param {number[]} col
 * @param {number} ax
 * @param {number} ay
 * @param {number} az
 * @param {number} bx
 * @param {number} by
 * @param {number} bz
 * @param {number} cx
 * @param {number} cy
 * @param {number} cz
 * @param {number} alpha
 */
function pushCloudTri(pos, nrm, col, ax, ay, az, bx, by, bz, cx, cy, cz, alpha) {
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
  const shade = 0.88 + alpha * 0.08
  for (let i = 0; i < 3; i += 1) {
    const px = i === 0 ? ax : i === 1 ? bx : cx
    const py = i === 0 ? ay : i === 1 ? by : cy
    const pz = i === 0 ? az : i === 1 ? bz : cz
    pos.push(px, py, pz)
    nrm.push(nx, ny, nz)
    col.push(shade, shade, Math.min(1, shade + 0.04))
  }
}
