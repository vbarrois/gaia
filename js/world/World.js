import { CELL, GRID, RAIN_AT, SIZE, sanitize } from './config.js'
import { clamp, hash, mix, rng, smooth } from './math.js'
import { Perlin } from './perlinGaya.js'

/**
 * @typedef {{
 *   x: number, z: number, px: number, pz: number, h: number,
 *   wet: boolean, rains: boolean,
 *   pollution: number, soil: number, moisture: number, veg: number
 * }} Cell
 */

/**
 * Ecological world grid — port of GayaCore.World.
 */
export class World {
  /** @param {Partial<import('./config.js').WorldConfig>} [config] */
  constructor(config) {
    this.config = sanitize(config)
    this.perlin = new Perlin(this.config.seed)
    this.day = 1
    this.energy = 100
    this.water = 80
    this.compost = 24
    this.waste = 0
    this.cloud = 18
    this.raining = false
    this.temp = 24
    this.wind = 1
    this.windTarget = 1
    /** Radians — direction du vent (nuages + dérive de pluie). */
    this.windAngle = 0.85
    this.windAngleTarget = 0.85
    /** Décalage spatial du champ de pluie (unités monde, poussé par le vent). */
    this.rainOffsetX = 0
    this.rainOffsetZ = 0
    /** Temps météo continu — morphing fluide du champ (pas de sauts). */
    this.rainTime = 0
    /** @type {Cell[]} */
    this.cells = []

    const rand = rng(this.config.seed + 17)
    for (let z = 0; z < GRID; z++) {
      for (let x = 0; x < GRID; x++) {
        const px = (x + 0.5) * CELL - SIZE / 2
        const pz = (z + 0.5) * CELL - SIZE / 2
        const h = this.height(px, pz)
        const wet = h < this.config.water
        const rains = !wet && this.rainField(px, pz) >= RAIN_AT
        const pollution = clamp(
          this.config.pollution + this.perlin.noise(px / 31 + 6, pz / 31 + 22, 4.6) * 54 + rand() * 10 - 5,
          0,
          100,
        )
        this.cells.push({
          x,
          z,
          px,
          pz,
          h,
          wet,
          rains,
          pollution,
          soil: clamp(36 - pollution * 0.22 + rand() * 18, 0, 100),
          moisture: wet ? 100 : clamp(39 + (this.config.water - h) * 1.1 + rand() * 16, 0, 100),
          veg: wet ? 0 : clamp((100 - pollution) * 0.31 + rand() * 9, 0, 100),
        })
      }
    }

    let best = null
    let bestScore = Infinity
    for (const c of this.cells) {
      if (c.wet || c.h > this.config.water + 25) continue
      const slope =
        Math.abs(this.height(c.px + 2, c.pz) - c.h) + Math.abs(this.height(c.px, c.pz + 2) - c.h)
      const score = Math.hypot(c.px + 22, c.pz - 15) + slope * 4
      if (score < bestScore) {
        best = c
        bestScore = score
      }
    }
    this.source = best ? { x: best.px, z: best.pz } : null
    if (this.source) {
      for (const c of this.cells) {
        const oasis = 1 - smooth(4, 19, Math.hypot(c.px - this.source.x, c.pz - this.source.z))
        if (!c.wet && oasis > 0) {
          c.pollution *= 1 - oasis * 0.87
          c.soil = mix(c.soil, 77, oasis)
          c.moisture = mix(c.moisture, 83, oasis)
          c.veg = mix(c.veg, 66, oasis)
        }
      }
    }

    this.initialPollution = this.cells.reduce((s, c) => s + c.pollution, 0)
    this.initialScore = this.stats().score
  }

  /** @param {number} x @param {number} z */
  field(x, z) {
    const c = this.config
    const s = c.scale
    const n = this.perlin
    const wx = n.noise((x / s) * 0.65 + 19, (z / s) * 0.65 + 11, 2.17) * c.warp
    const wz = n.noise((x / s) * 0.65 - 31, (z / s) * 0.65 + 8, 7.39) * c.warp
    return n.fbm((x + wx) / s + 0.137, (z + wz) / s + 0.873, c.octaves, c.persistence)
  }

  /** @param {number} x @param {number} z */
  height(x, z) {
    const f = this.field(x, z)
    const edge = smooth(0.52, 1, Math.max(Math.abs(x), Math.abs(z)) / (SIZE / 2))
    return 10 + f * this.config.amplitude * 1.72 - edge * this.config.amplitude * 0.95 * (this.config.falloff / 100)
  }

  /** @param {number} x @param {number} z */
  rainField(x, z) {
    const t = this.rainTime
    // Advection douce + léger curl temporel pour que les lobes se déforment sans sauter.
    const curl = t * 0.07
    const px = x - this.rainOffsetX + Math.sin(z * 0.018 + curl) * 4.2
    const pz = z - this.rainOffsetZ + Math.cos(x * 0.018 + curl * 0.9) * 4.2
    const v = this.perlin.fbm(px / 52 + 63.2, pz / 52 - 17.8 + t * 0.04, 3, 0.5)
    return clamp(v * 0.95 + 0.5)
  }

  /** Recalcule le masque `rains` après dérive du champ. */
  syncRainMask() {
    for (const c of this.cells) {
      c.rains = !c.wet && this.rainField(c.px, c.pz) >= RAIN_AT
    }
  }

  /**
   * @param {number} current
   * @param {number} target
   * @param {number} t 0–1
   */
  static lerpAngle(current, target, t) {
    let d = target - current
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    return current + d * t
  }

  /**
   * Météo continue : vent lissé, dérive et morphing fluide du champ de pluie.
   * @param {number} dt seconds
   * @param {number} [speedScale] multiplicateur (ex. vitesse de jeu)
   */
  driftWeather(dt, speedScale = 1) {
    if (!(dt > 0) || !(speedScale > 0)) return
    const ease = 1 - Math.exp(-dt * 1.1)
    this.wind += (this.windTarget - this.wind) * ease
    this.windAngle = World.lerpAngle(this.windAngle, this.windAngleTarget, ease)

    const scaled = dt * speedScale
    this.rainTime += scaled
    // Dérive modérée : assez pour lire le vent, sans à-coups entre frames.
    const step = this.wind * scaled * 4.2
    this.rainOffsetX += Math.cos(this.windAngle) * step
    this.rainOffsetZ += Math.sin(this.windAngle) * step
    this.syncRainMask()
  }

  /** @param {number} x @param {number} z @returns {Cell} */
  cellAt(x, z) {
    const ix = clamp(Math.floor((x + SIZE / 2) / CELL), 0, GRID - 1)
    const iz = clamp(Math.floor((z + SIZE / 2) / CELL), 0, GRID - 1)
    return this.cells[iz * GRID + ix]
  }

  /**
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {Cell[]}
   */
  neighborhood(x, z, radius) {
    return this.cells.filter((c) => Math.hypot(c.px - x, c.pz - z) <= radius)
  }

  stats() {
    let p = 0
    let v = 0
    let soil = 0
    let dry = 0
    let wet = 0
    for (const c of this.cells) {
      p += c.pollution
      if (c.wet) {
        wet++
        continue
      }
      v += c.veg
      soil += c.soil
      dry++
    }
    const pollution = p / this.cells.length
    const vegetation = dry ? v / dry : 0
    const fertility = dry ? soil / dry : 0
    return {
      pollution,
      vegetation,
      fertility,
      wet: (wet / this.cells.length) * 100,
      score: Math.round((100 - pollution) * 0.45 + vegetation * 0.35 + fertility * 0.2),
      trees: this.cells.filter(
        (c) => !c.wet && c.veg > 25 && hash(this.config.seed + c.x + c.z * GRID) < c.veg / 125,
      ).length,
    }
  }

  step() {
    this.day++
    const n = this.perlin
    this.temp = 24 + n.noise(this.day * 0.045, 21.37, 5.9) * 13
    // Cibles seulement — le vent et la pluie rejoignent en douceur via driftWeather.
    this.windTarget = 0.9 + n.noise(this.day * 0.03, 5, 8) * 0.7
    this.windAngleTarget = n.noise(this.day * 0.021, 2.4, 9) * Math.PI * 2
    let evap = 0
    this.raining = this.cloud >= 49
    for (const c of this.cells) {
      if (c.wet) {
        evap += 0.025
        continue
      }
      const loss = Math.min(c.moisture, 0.2 + Math.max(0, this.temp - 13) * 0.038 + c.veg * 0.006)
      c.moisture -= loss
      evap += (loss / this.cells.length) * 6
      if (this.raining && c.rains) c.moisture = clamp(c.moisture + 15, 0, 100)
      if (this.source) {
        const d = Math.hypot(c.px - this.source.x, c.pz - this.source.z)
        if (d < 8) c.moisture = clamp(c.moisture + (1 - d / 8) * 8, 0, 100)
      }
      if (c.veg > 0) {
        if (c.moisture > 19 && c.pollution < 67 && c.soil > 14) {
          c.veg = clamp(c.veg + 0.2 + c.soil * 0.005, 0, 100)
          c.soil = clamp(c.soil + c.veg * 0.0014, 0, 100)
          c.pollution = Math.max(0, c.pollution - c.veg * 0.0025)
        } else {
          c.veg = Math.max(0, c.veg - 0.7)
        }
      }
    }
    this.cloud = clamp(this.cloud + evap + (this.raining ? -26 : 0), 0, 100)
    this.energy = clamp(this.energy + 13, 0, 100)
    this.compost = clamp(this.compost + 0.2 + this.stats().vegetation * 0.012, 0, 99)
    return this.stats()
  }

  /**
   * @param {string} type
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   */
  act(type, x, z, radius) {
    if (type === 'inspect') return { ok: true, message: 'Zone observée.' }
    let selected = this.neighborhood(x, z, radius)
    if (!selected.length) selected = [this.cellAt(x, z)]
    const dry = selected.filter((c) => !c.wet)
    let targets = []
    let costE = 0
    let costW = 0
    let costC = 0

    if (type === 'clean') {
      targets = selected.filter((c) => c.pollution >= 1)
      costE = Math.ceil(3 + targets.length * 0.22)
    } else if (type === 'water') {
      targets = dry.filter((c) => c.moisture < 95)
      costE = 2
      costW = Math.ceil(targets.length * 0.65)
    } else if (type === 'soil') {
      targets = dry.filter((c) => c.soil < 95)
      costE = 4
      costC = Math.ceil(targets.length * 0.25)
    } else if (type === 'plant') {
      targets = dry.filter((c) => c.soil >= 25 && c.moisture >= 18 && c.pollution < 70 && c.veg < 90)
      costE = Math.ceil(3 + targets.length * 0.15)
      costW = 3
    } else if (type === 'purify') {
      const c = this.cellAt(x, z)
      const near = this.source && Math.hypot(x - this.source.x, z - this.source.z) < 10
      if (!c.wet && !near) {
        return { ok: false, message: 'Puise dans un plan d’eau ou près de la source.' }
      }
      if (this.water >= 149) return { ok: false, message: 'La réserve d’eau est déjà pleine.' }
      costE = 6
      targets = [c]
    } else {
      return { ok: false, message: 'Action inconnue.' }
    }

    if (!targets.length) {
      return {
        ok: false,
        message:
          type === 'plant'
            ? 'Pour planter : sol ≥ 25, humidité ≥ 18, pollution < 70.'
            : 'Aucune case ne peut recevoir cette action ici.',
      }
    }
    if (this.energy < costE) return { ok: false, message: 'Énergie insuffisante : laisse passer un jour.' }
    if (this.water < costW) return { ok: false, message: 'Eau insuffisante : utilise Puiser.' }
    if (this.compost < costC) {
      return { ok: false, message: 'Compost insuffisant : il se renouvelle avec la végétation.' }
    }

    this.energy -= costE
    this.water -= costW
    this.compost -= costC
    let removed = 0
    for (const c of targets) {
      if (type === 'clean') {
        const amount = Math.min(22, c.pollution)
        c.pollution -= amount
        removed += amount
      }
      if (type === 'water') c.moisture = clamp(c.moisture + 25, 0, 100)
      if (type === 'soil') c.soil = clamp(c.soil + 22, 0, 100)
      if (type === 'plant') c.veg = clamp(c.veg + 22, 0, 100)
    }
    if (type === 'purify') {
      this.water = clamp(this.water + 28, 0, 150)
      const c = targets[0]
      removed = Math.min(6, c.pollution)
      c.pollution -= removed
    }
    this.waste += removed
    return {
      ok: true,
      message: {
        clean: 'Pollution retirée et isolée.',
        water: 'Le sol est arrosé.',
        soil: 'Le sol est enrichi.',
        plant: 'La végétation est plantée.',
        purify: '+28 d’eau propre.',
      }[type],
      count: targets.length,
      costE,
      costW,
      costC,
    }
  }
}
