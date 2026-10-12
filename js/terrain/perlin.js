/**
 * Classic 2D Perlin noise with a seeded permutation table.
 * Output of noise2D / fbm2D is approximately in [-1, 1].
 */

const FADE_SCALE = 6
const FADE_OFFSET = 15
const FADE_BIAS = 10

/**
 * @param {number} t
 * @returns {number}
 */
export function fade(t) {
  return t * t * t * (t * (t * FADE_SCALE - FADE_OFFSET) + FADE_BIAS)
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + t * (b - a)
}

/**
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 4-gradient hash used by classic Perlin (gives values roughly in [-√2, √2]).
 * @param {number} hash
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
export function grad(hash, x, y) {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return (h & 1 ? -u : u) + (h & 2 ? -v : v)
}

/**
 * @param {number} seed
 * @returns {Uint8Array} length-512 permutation (p[i] = perm[i & 255])
 */
export function createPermutation(seed) {
  const random = mulberry32(seed >>> 0)
  const perm = new Uint8Array(256)
  for (let i = 0; i < 256; i += 1) {
    perm[i] = i
  }
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = perm[i]
    perm[i] = perm[j]
    perm[j] = tmp
  }
  const p = new Uint8Array(512)
  for (let i = 0; i < 512; i += 1) {
    p[i] = perm[i & 255]
  }
  return p
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Uint8Array} p
 * @returns {number}
 */
export function noise2D(x, y, p) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const X = xi & 255
  const Y = yi & 255
  const xf = x - xi
  const yf = y - yi
  const u = fade(xf)
  const v = fade(yf)

  const aa = p[p[X] + Y]
  const ab = p[p[X] + Y + 1]
  const ba = p[p[X + 1] + Y]
  const bb = p[p[X + 1] + Y + 1]

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u)
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u)
  return lerp(x1, x2, v)
}

/**
 * @typedef {{ octaves?: number, persistence?: number, lacunarity?: number }} FbmOptions
 */

/**
 * Fractal Brownian motion from stacked Perlin octaves, normalized by amplitude sum.
 * @param {number} x
 * @param {number} y
 * @param {Uint8Array} p
 * @param {FbmOptions} [options]
 * @returns {number}
 */
export function fbm2D(x, y, p, options = {}) {
  const octaves = options.octaves ?? 5
  const persistence = options.persistence ?? 0.5
  const lacunarity = options.lacunarity ?? 2
  if (octaves < 1) {
    return 0
  }

  let amplitude = 1
  let frequency = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i += 1) {
    sum += amplitude * noise2D(x * frequency, y * frequency, p)
    norm += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }
  return norm === 0 ? 0 : sum / norm
}
