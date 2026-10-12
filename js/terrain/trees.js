import { GRID } from '../world/config.js'
import { hash } from '../world/math.js'

/**
 * Placements d’arbres Gaya : veg > 25 + tirage déterministe.
 * @param {import('../world/World.js').World} world
 * @returns {{ x: number, y: number, z: number, s: number, r: number, veg: number }[]}
 */
export function collectTreePlacements(world) {
  /** @type {{ x: number, y: number, z: number, s: number, r: number, veg: number }[]} */
  const list = []
  for (const c of world.cells) {
    const r = hash(world.config.seed + c.x + c.z * GRID)
    if (c.wet || c.veg <= 25 || r >= c.veg / 125) continue
    const x = c.px + (hash(c.x + c.z * 89 + 442) - 0.5) * 1.8
    const z = c.pz + (hash(c.x + c.z * 12 + 72) - 0.5) * 1.8
    const y = world.height(x, z)
    if (y < world.config.water + 0.25) continue
    const s = 0.7 + c.veg * 0.018
    list.push({ x, y, z, s, r, veg: c.veg })
  }
  return list
}
