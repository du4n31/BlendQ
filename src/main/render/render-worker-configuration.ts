import type { RenderOverrides, RenderResolutionOverrides } from '../../shared/types'

export type { RenderOverrides, RenderResolutionOverrides }

export type RenderWorkerSource =
  | {
      type: 'local'
    }
  | {
      type: 'colab'
      connectionId: string
    }

export interface RenderWorkerConfiguration {
  id: string
  source: RenderWorkerSource
  overrides: RenderOverrides
}

export function resolveRenderWorkerOverrides(
  defaults: RenderOverrides,
  overrides: RenderOverrides
): RenderOverrides {
  const result: RenderOverrides = {
    ...defaults,
    ...overrides
  }

  if (defaults.resolution || overrides.resolution) {
    result.resolution = {
      ...defaults.resolution,
      ...overrides.resolution
    }
  } else {
    delete result.resolution
  }

  return result
}
