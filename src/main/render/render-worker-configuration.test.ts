import { describe, expect, it } from 'vitest'

import { resolveRenderWorkerOverrides } from './render-worker-configuration'

describe('resolveRenderWorkerOverrides', () => {
  it('inherits all default render settings when the worker has no overrides', () => {
    const result = resolveRenderWorkerOverrides(
      {
        renderEngine: 'BLENDER_EEVEE_NEXT',
        outputFormat: 'PNG',
        resolution: {
          width: 1920,
          height: 1080,
          percentage: 100
        },
        samples: 64
      },
      {}
    )

    expect(result).toEqual({
      renderEngine: 'BLENDER_EEVEE_NEXT',
      outputFormat: 'PNG',
      resolution: {
        width: 1920,
        height: 1080,
        percentage: 100
      },
      samples: 64
    })
  })

  it('allows a worker to override individual render settings', () => {
    const result = resolveRenderWorkerOverrides(
      {
        renderEngine: 'BLENDER_EEVEE_NEXT',
        outputFormat: 'PNG',
        samples: 64
      },
      {
        renderEngine: 'CYCLES',
        outputFormat: 'OPEN_EXR',
        samples: 256
      }
    )

    expect(result).toEqual({
      renderEngine: 'CYCLES',
      outputFormat: 'OPEN_EXR',
      samples: 256
    })
  })

  it('merges individual resolution properties with the defaults', () => {
    const result = resolveRenderWorkerOverrides(
      {
        resolution: {
          width: 1920,
          height: 1080,
          percentage: 100
        }
      },
      {
        resolution: {
          percentage: 50
        }
      }
    )

    expect(result).toEqual({
      resolution: {
        width: 1920,
        height: 1080,
        percentage: 50
      }
    })
  })

  it('supports worker settings without global defaults', () => {
    const result = resolveRenderWorkerOverrides(
      {},
      {
        outputFormat: 'OPEN_EXR',
        resolution: {
          width: 3840,
          height: 2160
        }
      }
    )

    expect(result).toEqual({
      outputFormat: 'OPEN_EXR',
      resolution: {
        width: 3840,
        height: 2160
      }
    })
  })

  it('does not create a resolution override when neither side defines one', () => {
    const result = resolveRenderWorkerOverrides(
      {
        renderEngine: 'CYCLES'
      },
      {
        outputFormat: 'PNG'
      }
    )

    expect(result).toEqual({
      renderEngine: 'CYCLES',
      outputFormat: 'PNG'
    })

    expect(result).not.toHaveProperty('resolution')
  })
})
