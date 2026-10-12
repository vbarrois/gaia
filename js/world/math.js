/** @param {number} v @param {number} [a] @param {number} [b] */
export function clamp(v, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v))
}

/** @param {number} a @param {number} b @param {number} t */
export function mix(a, b, t) {
  return a + (b - a) * t
}

/** @param {number} a @param {number} b @param {number} x */
export function smooth(a, b, x) {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** @param {number} seed */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** @param {number} n */
export function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

/**
 * @param {number[]} a
 * @param {number[]} b
 * @param {number} t
 * @returns {[number, number, number]}
 */
export function lerpColor(a, b, t) {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
}
