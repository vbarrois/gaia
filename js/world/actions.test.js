import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ACTIONS, ACTION_IDS, isActionType } from './actions.js'

describe('ACTIONS', () => {
  it('lists the six gameplay tools', () => {
    assert.deepEqual(ACTION_IDS.sort(), ['clean', 'inspect', 'plant', 'purify', 'soil', 'water'].sort())
    for (const id of ACTION_IDS) {
      assert.ok(ACTIONS[id].name)
      assert.ok(ACTIONS[id].text)
    }
  })

  it('isActionType guards unknown tools', () => {
    assert.equal(isActionType('clean'), true)
    assert.equal(isActionType('explode'), false)
  })
})
