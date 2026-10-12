import { DAY_SECONDS } from '../world/config.js'

/**
 * Simulation clock: pause / 1× / 3× / single step.
 */
export class TimeManager {
  constructor() {
    /** @type {0 | 1 | 3} */
    this.speed = 0
    this.accumulator = 0
  }

  /**
   * @param {0 | 1 | 3 | number} speed
   */
  setSpeed(speed) {
    const n = +speed
    this.speed = n === 1 || n === 3 ? n : 0
    this.accumulator = 0
    return this.speed
  }

  /**
   * @param {number} dtSeconds
   * @param {() => void} onDay
   * @returns {boolean} true if a day advanced
   */
  update(dtSeconds, onDay) {
    if (this.speed === 0) return false
    this.accumulator += dtSeconds * this.speed
    if (this.accumulator < DAY_SECONDS) return false
    this.accumulator -= DAY_SECONDS
    onDay()
    return true
  }

  /**
   * @param {() => void} onDay
   */
  stepOnce(onDay) {
    this.accumulator = 0
    onDay()
  }
}
