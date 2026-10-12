import { mix, rng } from './math.js'

/**
 * Seeded Perlin noise (Ken Perlin 2002 style) — port from GayaCore.
 */
export class Perlin {
  /** @param {number} seed */
  constructor(seed) {
    const rand = rng(seed)
    const p = Array.from({ length: 256 }, (_, i) => i)
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[p[i], p[j]] = [p[j], p[i]]
    }
    this.p = Uint16Array.from({ length: 512 }, (_, i) => p[i & 255])
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} [z]
   */
  noise(x, y, z = 0.735) {
    const p = this.p
    let X = Math.floor(x) & 255
    let Y = Math.floor(y) & 255
    let Z = Math.floor(z) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10)
    const grad = (h, gx, gy, gz) => {
      h &= 15
      const u = h < 8 ? gx : gy
      const v = h < 4 ? gy : h === 12 || h === 14 ? gx : gz
      return (h & 1 ? -u : u) + (h & 2 ? -v : v)
    }
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z
    return mix(
      mix(
        mix(grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z), u),
        mix(grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z), u),
        v,
      ),
      mix(
        mix(grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1), u),
        mix(grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1), u),
        v,
      ),
      w,
    )
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} octaves
   * @param {number} persistence
   */
  fbm(x, z, octaves, persistence) {
    let value = 0
    let a = 1
    let total = 0
    let f = 1
    for (let o = 0; o < octaves; o++) {
      value += this.noise(x * f, z * f, 0.735 + o * 0.411) * a
      total += a
      a *= persistence
      f *= 2
    }
    return value / total
  }
}
