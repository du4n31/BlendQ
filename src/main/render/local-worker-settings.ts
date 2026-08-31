import type { LocalWorkerSettings } from '../../shared/types'
import type { LocalConcurrencyRecommendation } from './local-concurrency-recommendation'

export type { LocalWorkerSettings }

export function resolveLocalWorkerCount(
  settings: LocalWorkerSettings,
  recommendation: LocalConcurrencyRecommendation
): number {
  switch (settings.mode) {
    case 'off':
      return 0

    case 'automatic':
      return recommendation.recommendedWorkers

    case 'manual':
      if (!Number.isSafeInteger(settings.workerCount) || settings.workerCount < 1) {
        throw new Error('Manual local worker count must be a positive integer.')
      }

      return settings.workerCount
  }
}

export function validateLocalWorkerSettings(value: unknown): LocalWorkerSettings {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid local worker settings.')
  }

  const settings = value as Record<string, unknown>

  switch (settings.mode) {
    case 'off':
      return {
        mode: 'off'
      }

    case 'automatic':
      return {
        mode: 'automatic'
      }

    case 'manual':
      if (
        typeof settings.workerCount !== 'number' ||
        !Number.isSafeInteger(settings.workerCount) ||
        settings.workerCount < 1
      ) {
        throw new Error('Manual local worker count must be a positive integer.')
      }

      return {
        mode: 'manual',
        workerCount: settings.workerCount
      }

    default:
      throw new Error('Invalid local worker mode.')
  }
}
