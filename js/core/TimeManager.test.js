import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DAY_SECONDS } from '../world/config.js'
import { TimeManager } from './TimeManager.js'

describe('TimeManager', () => {
  it('does not advance while paused', () => {
    const time = new TimeManager()
    let days = 0
    time.setSpeed(0)
    time.update(DAY_SECONDS * 2, () => {
      days += 1
    })
    assert.equal(days, 0)
  })

  it('advances a day after DAY_SECONDS at 1×', () => {
    const time = new TimeManager()
    let days = 0
    time.setSpeed(1)
    time.update(DAY_SECONDS - 0.1, () => {
      days += 1
    })
    assert.equal(days, 0)
    time.update(0.2, () => {
      days += 1
    })
    assert.equal(days, 1)
  })

  it('stepOnce always fires once', () => {
    const time = new TimeManager()
    let days = 0
    time.stepOnce(() => {
      days += 1
    })
    assert.equal(days, 1)
  })
})
