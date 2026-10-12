import { ACTION_IDS, ACTIONS, isActionType } from '../world/actions.js'

/**
 * Brush tool selection and World.act dispatch.
 */
export class ActionManager {
  constructor() {
    /** @type {string} */
    this.tool = 'inspect'
    this.radius = 8
  }

  /**
   * @param {string} tool
   */
  setTool(tool) {
    if (!isActionType(tool)) return this.tool
    this.tool = tool
    return this.tool
  }

  /**
   * @param {number} radius
   */
  setRadius(radius) {
    const n = Math.round(+radius)
    this.radius = Math.min(16, Math.max(3, Number.isFinite(n) ? n : 8))
    return this.radius
  }

  help() {
    return ACTIONS[this.tool]
  }

  list() {
    return ACTION_IDS.map((id) => ({ id, ...ACTIONS[id] }))
  }

  /**
   * @param {import('../world/World.js').World} world
   * @param {number} x
   * @param {number} z
   */
  apply(world, x, z) {
    return world.act(this.tool, x, z, this.radius)
  }
}
