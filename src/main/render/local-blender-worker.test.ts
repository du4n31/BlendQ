import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RenderFrameTask } from '../../shared/types'
import { startLocalRender } from '../services/blender'
import { LocalBlenderWorker } from './local-blender-worker'

vi.mock('../services/blender', () => ({
  startLocalRender: vi.fn()
}))

const mockedStartLocalRender = vi.mocked(startLocalRender)

describe('LocalBlenderWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockedStartLocalRender.mockResolvedValue(undefined)
  })

  it('has the configured worker identity', () => {
    const worker = new LocalBlenderWorker({
      id: 'local-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe'
    })

    expect(worker.id).toBe('local-1')
    expect(worker.type).toBe('local')
  })

  it('renders a frame using the configured Blender executable', async () => {
    const worker = new LocalBlenderWorker({
      id: 'local-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe'
    })

    const task: RenderFrameTask = {
      blendFilePath: 'C:\\Projects\\test.blend',
      sceneName: 'Scene',
      frame: 42,
      outputMode: 'scene-output',
      outputDirectory: 'C:\\Renders'
    }

    const onEvent = vi.fn()

    await worker.renderFrame(task, onEvent)

    expect(mockedStartLocalRender).toHaveBeenCalledOnce()

    expect(mockedStartLocalRender).toHaveBeenCalledWith(
      {
        blenderExecutablePath: 'C:\\Blender\\blender.exe',
        blendFilePath: 'C:\\Projects\\test.blend',
        sceneName: 'Scene',
        frame: 42,
        outputMode: 'scene-output',
        outputDirectory: 'C:\\Renders'
      },
      onEvent
    )
  })

  it('forwards render worker events to the caller', async () => {
    const worker = new LocalBlenderWorker({
      id: 'local-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe'
    })

    const task: RenderFrameTask = {
      blendFilePath: 'C:\\Projects\\test.blend',
      sceneName: 'Scene',
      frame: 42,
      outputMode: 'scene-output',
      outputDirectory: 'C:\\Renders'
    }

    mockedStartLocalRender.mockImplementation(async (_request, onEvent) => {
      onEvent({
        type: 'output-saved',
        scene: 'Scene',
        frame: 42,
        path: 'C:\\Renders\\42.exr'
      })
    })

    const onEvent = vi.fn()

    await worker.renderFrame(task, onEvent)

    expect(onEvent).toHaveBeenCalledWith({
      type: 'output-saved',
      scene: 'Scene',
      frame: 42,
      path: 'C:\\Renders\\42.exr'
    })
  })

  it('propagates render failures', async () => {
    const worker = new LocalBlenderWorker({
      id: 'local-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe'
    })

    const task: RenderFrameTask = {
      blendFilePath: 'C:\\Projects\\test.blend',
      sceneName: 'Scene',
      frame: 42,
      outputMode: 'scene-output',
      outputDirectory: 'C:\\Renders'
    }

    mockedStartLocalRender.mockRejectedValue(new Error('Blender render process failed.'))

    await expect(worker.renderFrame(task, () => undefined)).rejects.toThrow(
      'Blender render process failed.'
    )
  })

  it('passes task overrides to the Blender render request', async () => {
    const worker = new LocalBlenderWorker({
      id: 'local-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe'
    })

    await worker.renderFrame(
      {
        blendFilePath: 'C:\\Projects\\project.blend',
        sceneName: 'Scene',
        frame: 1,
        outputMode: 'scene-output',
        outputDirectory: 'C:\\Renders',
        overrides: {
          renderEngine: 'CYCLES',
          outputFormat: 'PNG',
          resolution: {
            width: 1920,
            height: 1080,
            percentage: 100
          }
        }
      },
      () => undefined
    )

    expect(startLocalRender).toHaveBeenCalledWith(
      {
        blendFilePath: 'C:\\Projects\\project.blend',
        sceneName: 'Scene',
        frame: 1,
        outputMode: 'scene-output',
        outputDirectory: 'C:\\Renders',
        overrides: {
          renderEngine: 'CYCLES',
          outputFormat: 'PNG',
          resolution: {
            width: 1920,
            height: 1080,
            percentage: 100
          }
        },
        blenderExecutablePath: 'C:\\Blender\\blender.exe'
      },
      expect.any(Function)
    )
  })

  it('lets worker overrides replace inherited task settings', async () => {
    const worker = new LocalBlenderWorker({
      id: 'local-2',
      blenderExecutablePath: 'C:\\Blender\\blender.exe',
      overrides: {
        outputFormat: 'OPEN_EXR',
        resolution: {
          percentage: 50
        }
      }
    })

    await worker.renderFrame(
      {
        blendFilePath: 'C:\\Projects\\project.blend',
        sceneName: 'Scene',
        frame: 4,
        outputMode: 'scene-output',
        outputDirectory: 'C:\\Renders',
        overrides: {
          outputFormat: 'PNG',
          resolution: {
            width: 1920,
            height: 1080,
            percentage: 100
          }
        }
      },
      () => undefined
    )

    expect(startLocalRender).toHaveBeenCalledWith(
      expect.objectContaining({
        overrides: {
          outputFormat: 'OPEN_EXR',
          resolution: {
            width: 1920,
            height: 1080,
            percentage: 50
          }
        }
      }),
      expect.any(Function)
    )
  })
})
