import { describe, expect, it } from 'vitest'

import type { LocalConcurrencyRecommendation } from './local-concurrency-recommendation'
import {
  resolveLocalWorkerCount,
  validateLocalWorkerSettings,
  type LocalWorkerSettings
} from './local-worker-settings'

const recommendation: LocalConcurrencyRecommendation = {
  recommendedWorkers: 2,
  maximumWorkers: 2,
  reasons: []
}

describe('resolveLocalWorkerCount', () => {
  it('disables local workers in off mode', () => {
    const settings: LocalWorkerSettings = {
      mode: 'off'
    }

    expect(resolveLocalWorkerCount(settings, recommendation)).toBe(0)
  })

  it('uses the recommended worker count in automatic mode', () => {
    const settings: LocalWorkerSettings = {
      mode: 'automatic'
    }

    expect(resolveLocalWorkerCount(settings, recommendation)).toBe(2)
  })

  it('uses the configured worker count in manual mode', () => {
    const settings: LocalWorkerSettings = {
      mode: 'manual',
      workerCount: 3
    }

    expect(resolveLocalWorkerCount(settings, recommendation)).toBe(3)
  })

  it('rejects zero manual workers', () => {
    const settings: LocalWorkerSettings = {
      mode: 'manual',
      workerCount: 0
    }

    expect(() => resolveLocalWorkerCount(settings, recommendation)).toThrow(
      'Manual local worker count must be a positive integer.'
    )
  })

  it('rejects fractional manual worker counts', () => {
    const settings: LocalWorkerSettings = {
      mode: 'manual',
      workerCount: 1.5
    }

    expect(() => resolveLocalWorkerCount(settings, recommendation)).toThrow(
      'Manual local worker count must be a positive integer.'
    )
  })
})

describe('validateLocalWorkerSettings', () => {
  it('validates automatic worker settings', () => {
    expect(
      validateLocalWorkerSettings({
        mode: 'automatic'
      })
    ).toEqual({
      mode: 'automatic'
    })
  })

  it('validates manual worker settings', () => {
    expect(
      validateLocalWorkerSettings({
        mode: 'manual',
        workerCount: 2
      })
    ).toEqual({
      mode: 'manual',
      workerCount: 2
    })
  })

  it('validates off worker settings', () => {
    expect(
      validateLocalWorkerSettings({
        mode: 'off'
      })
    ).toEqual({
      mode: 'off'
    })
  })

  it('rejects an unknown worker mode', () => {
    expect(() =>
      validateLocalWorkerSettings({
        mode: 'turbo'
      })
    ).toThrow('Invalid local worker mode.')
  })

  it('rejects invalid manual worker settings', () => {
    expect(() =>
      validateLocalWorkerSettings({
        mode: 'manual',
        workerCount: -1
      })
    ).toThrow('Manual local worker count must be a positive integer.')
  })

  it('rejects non-object worker settings', () => {
    expect(() => validateLocalWorkerSettings(null)).toThrow('Invalid local worker settings.')
  })
})
