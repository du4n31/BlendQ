import { describe, expect, it, vi } from 'vitest'

import type { BlenderInstallation } from '../../shared/types'
import * as blenderService from '../services/blender'
import { createRenderWorkerPool } from './render-worker-pool'
import type { RenderWorkerConfiguration } from './render-worker-configuration'

vi.mock('../services/blender', async () => {
  const actual = await vi.importActual<typeof import('../services/blender')>('../services/blender')

  return {
    ...actual,
    startLocalRender: vi.fn()
  }
})

const blenderInstallation: BlenderInstallation = {
  executablePath: 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe',
  version: 'Blender 5.2.0 LTS',
  major: 5,
  minor: 2,
  patch: 0,
  isLts: true
}

describe('createRenderWorkerPool', () => {
  it('creates a local worker from a local configuration', async () => {
    const configurations: RenderWorkerConfiguration[] = [
      {
        id: 'local-1',
        source: {
          type: 'local'
        },
        overrides: {}
      }
    ]

    const workers = createRenderWorkerPool({
      configurations,
      blenderInstallation
    })

    expect(workers).toHaveLength(1)

    expect(workers[0]).toMatchObject({
      id: 'local-1',
      type: 'local'
    })
  })

  it('creates multiple independent local workers', () => {
    const configurations: RenderWorkerConfiguration[] = [
      {
        id: 'local-1',
        source: {
          type: 'local'
        },
        overrides: {}
      },
      {
        id: 'local-2',
        source: {
          type: 'local'
        },
        overrides: {
          resolution: {
            percentage: 50
          }
        }
      }
    ]

    const workers = createRenderWorkerPool({
      configurations,
      blenderInstallation
    })

    expect(workers.map((worker) => worker.id)).toEqual(['local-1', 'local-2'])

    expect(workers.every((worker) => worker.type === 'local')).toBe(true)
  })

  it('passes worker overrides to the local worker', async () => {
    vi.mocked(blenderService.startLocalRender).mockResolvedValue(undefined)

    const configurations: RenderWorkerConfiguration[] = [
      {
        id: 'local-1',
        source: {
          type: 'local'
        },
        overrides: {
          renderEngine: 'CYCLES',
          resolution: {
            percentage: 50
          }
        }
      }
    ]

    const [worker] = createRenderWorkerPool({
      configurations,
      blenderInstallation
    })

    await worker.renderFrame(
      {
        blendFilePath: 'C:\\Projects\\test.blend',
        sceneName: 'Scene',
        frame: 1,
        outputMode: 'scene-output',
        outputDirectory: 'C:\\Renders'
      },
      () => undefined
    )

    expect(blenderService.startLocalRender).toHaveBeenCalledWith(
      {
        blendFilePath: 'C:\\Projects\\test.blend',
        sceneName: 'Scene',
        frame: 1,
        outputMode: 'scene-output',
        outputDirectory: 'C:\\Renders',
        blenderExecutablePath: blenderInstallation.executablePath,
        overrides: {
          renderEngine: 'CYCLES',
          resolution: {
            percentage: 50
          }
        }
      },
      expect.any(Function)
    )
  })

  it('rejects unsupported Colab workers for now', () => {
    const configurations: RenderWorkerConfiguration[] = [
      {
        id: 'colab-1',
        source: {
          type: 'colab',
          connectionId: 'connection-1'
        },
        overrides: {}
      }
    ]

    expect(() =>
      createRenderWorkerPool({
        configurations,
        blenderInstallation
      })
    ).toThrow('Colab worker "colab-1" is not supported yet.')
  })
})
