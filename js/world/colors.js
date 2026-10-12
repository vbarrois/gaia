import { RAIN_AT, SIZE } from './config.js'
import { clamp, lerpColor, mix, smooth } from './math.js'

const RGB = {
  soil: [138, 112, 78],
  grass: [92, 148, 72],
  polluted: [140, 96, 132],
  rock: [122, 118, 108],
  shore: [168, 152, 118],
}

/**
 * @param {import('./World.js').World} world
 * @param {number} x
 * @param {number} z
 * @param {number} h
 * @param {string} layer
 * @returns {[number, number, number]} RGB 0–255
 */
export function terrainColor(world, x, z, h, layer = 'natural') {
  const c = world.cellAt(x, z)
  if (layer === 'perlin') {
    const t = clamp(world.field(x, z) * 0.95 + 0.5)
    const g = Math.round(t * 255)
    return [g, g, g]
  }
  if (layer === 'rain') {
    if (h < world.config.water) return [42, 96, 108]
    const r = world.rainField(x, z)
    if (r < RAIN_AT) return [96, 102, 82]
    return lerpColor([52, 124, 158], [198, 232, 246], clamp((r - RAIN_AT) / (1 - RAIN_AT)))
  }
  if (layer === 'pollution') return lerpColor([100, 158, 97], [157, 82, 151], c.pollution / 100)
  if (layer === 'moisture') return lerpColor([191, 147, 85], [52, 152, 185], c.moisture / 100)
  if (layer === 'soil') return lerpColor([148, 102, 78], [121, 175, 90], c.soil / 100)
  if (layer === 'height') {
    const f = clamp((h + 20) / 75)
    return f < 0.45
      ? lerpColor([54, 108, 125], [151, 188, 106], f / 0.45)
      : lerpColor([151, 188, 106], [242, 232, 204], (f - 0.45) / 0.55)
  }
  if (h < world.config.water) {
    return lerpColor([125, 164, 140], [56, 107, 117], clamp((world.config.water - h) / 15))
  }
  let col = lerpColor(RGB.soil, RGB.grass, c.veg / 70)
  col = lerpColor(col, RGB.polluted, smooth(33, 90, c.pollution) * 0.7)
  col = lerpColor(col, RGB.rock, smooth(19, 42, h) * 0.8)
  if (h < world.config.water + 1.5) {
    col = lerpColor(col, RGB.shore, (1 - (h - world.config.water) / 1.5) * 0.8)
  }
  if (world.raining && h >= world.config.water && world.rainField(x, z) >= RAIN_AT) {
    col = lerpColor(col, [176, 214, 230], 0.4)
  }
  return col
}

/**
 * @param {[number, number, number]} rgb
 * @returns {[number, number, number]}
 */
export function rgb01(rgb) {
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255]
}

/**
 * Build indexed heightfield mesh data from a World.
 * @param {import('./World.js').World} world
 * @param {string} [layer]
 */
export function buildWorldMesh(world, layer = 'natural') {
  const n = world.config.resolution
  const positions = new Float32Array((n + 1) * (n + 1) * 3)
  const colors = new Float32Array((n + 1) * (n + 1) * 3)
  let low = Infinity
  let vi = 0
  for (let iz = 0; iz <= n; iz++) {
    for (let ix = 0; ix <= n; ix++) {
      const x = (ix / n) * SIZE - SIZE / 2
      const z = (iz / n) * SIZE - SIZE / 2
      const h = world.height(x, z)
      positions[vi] = x
      positions[vi + 1] = h
      positions[vi + 2] = z
      const [r, g, b] = rgb01(terrainColor(world, x, z, h, layer))
      colors[vi] = r
      colors[vi + 1] = g
      colors[vi + 2] = b
      low = Math.min(low, h)
      vi += 3
    }
  }
  const indices = new Uint32Array(n * n * 6)
  let ii = 0
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const a = iz * (n + 1) + ix
      const b = a + 1
      const d = a + n + 1
      const c = d + 1
      indices[ii++] = a
      indices[ii++] = d
      indices[ii++] = b
      indices[ii++] = b
      indices[ii++] = d
      indices[ii++] = c
    }
  }
  return {
    positions,
    colors,
    indices,
    low,
    triangleCount: n * n * 2,
    waterY: world.config.water,
  }
}

/**
 * Contour segments where the rain field crosses RAIN_AT (Gaya “liseré”).
 * @param {import('./World.js').World} world
 * @param {Float32Array} positions
 * @param {Uint32Array} indices
 * @returns {Float32Array}
 */
export function buildRainOutline(world, positions, indices) {
  /** @type {number[]} */
  const rain = []
  const water = world.config.water
  // Ignore les contours collés au bord du maillage (faux « rectangle »).
  const edge = SIZE / 2 - 1.25
  const onBorder = (x, z) => Math.abs(x) >= edge || Math.abs(z) >= edge
  for (let i = 0; i < indices.length; i += 3) {
    /** @type {number[]} */
    const hits = []
    for (let e = 0; e < 3; e++) {
      const ia = indices[i + e]
      const ib = indices[i + ((e + 1) % 3)]
      const ax = positions[ia * 3]
      const az = positions[ia * 3 + 2]
      const bx = positions[ib * 3]
      const bz = positions[ib * 3 + 2]
      if (onBorder(ax, az) && onBorder(bx, bz)) continue
      const da = world.rainField(ax, az) - RAIN_AT
      const db = world.rainField(bx, bz) - RAIN_AT
      if ((da < 0 && db >= 0) || (db < 0 && da >= 0)) {
        const t = da / (da - db)
        const x = mix(ax, bx, t)
        const z = mix(az, bz, t)
        if (onBorder(x, z)) continue
        hits.push(x, Math.max(world.height(x, z), water) + 0.4, z)
      }
    }
    if (hits.length === 6) rain.push(...hits)
  }
  return new Float32Array(rain)
}

/**
 * Paint a top-down Perlin / rain field into an ImageData buffer.
 * @param {import('./World.js').World} world
 * @param {'perlin' | 'rain'} layer
 * @param {ImageData} image
 */
export function paintFieldImage(world, layer, image) {
  const n = image.width
  const data = image.data
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = ((ix + 0.5) / n) * SIZE - SIZE / 2
      const z = ((iz + 0.5) / n) * SIZE - SIZE / 2
      const h = layer === 'rain' ? world.height(x, z) : 0
      const rgb = terrainColor(world, x, z, h, layer)
      const i = (iz * n + ix) * 4
      data[i] = rgb[0]
      data[i + 1] = rgb[1]
      data[i + 2] = rgb[2]
      data[i + 3] = 255
    }
  }
}
