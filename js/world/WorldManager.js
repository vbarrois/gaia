import { sanitize } from './config.js'
import { World } from './World.js'

/**
 * Owns the live World instance (preview or committed game).
 */
export class WorldManager {
  constructor() {
    /** @type {World | null} */
    this.world = null
    /** @type {World | null} */
    this.committed = null
  }

  /**
   * @param {Partial<import('./config.js').WorldConfig>} config
   * @returns {World}
   */
  rebuild(config) {
    this.world = new World(config)
    return this.world
  }

  /** @returns {import('./config.js').WorldConfig | null} */
  getConfig() {
    return this.world ? { ...this.world.config } : null
  }

  stats() {
    return this.world?.stats() ?? null
  }

  /**
   * Lock current preview as the playable game world.
   * @returns {World}
   */
  commit() {
    if (!this.world) this.rebuild(sanitize({}))
    this.committed = this.world
    return this.committed
  }

  /**
   * Restore the last committed world (cancel editor preview).
   * @returns {World | null}
   */
  restoreCommitted() {
    if (!this.committed) return null
    this.world = this.committed
    return this.world
  }

  /**
   * @param {number} x
   * @param {number} z
   */
  cellAt(x, z) {
    return this.world?.cellAt(x, z) ?? null
  }

  get hasGame() {
    return !!this.committed
  }
}
