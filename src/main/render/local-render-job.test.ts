import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RenderEvent, StartLocalRenderRequest } from '../../shared/types'

import { startLocalRender } from '../services/blender'
import { startLocalRenderJob } from './local-render-job'

vi.mock('../services/blender', () => ({
  startLocalRender: vi.fn()
}))

const mockedStartLocalRender = vi.mocked(startLocalRender)

const request: StartLocalRenderRequest = {
  blendFilePath: 'C:\\Projects\\test.blend',
  sceneName: 'Scene',
  frameRange: {
    start: 1,
    end: 3,
    step: 1
  },
  outputMode: 'scene-output',
  outputDirectory: 'C:\\Renders'
}

describe('startLocalRenderJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockedStartLocalRender.mockResolvedValue()
  })

  it('renders every frame in the range sequentially', async () => {
    const events: RenderEvent[] = []

    await startLocalRenderJob({
      renderId: 'render-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe',
      request,
      onEvent: (event) => {
        events.push(event)
      }
    })

    expect(mockedStartLocalRender).toHaveBeenCalledTimes(3)

    expect(mockedStartLocalRender.mock.calls.map(([renderRequest]) => renderRequest.frame)).toEqual(
      [1, 2, 3]
    )

    expect(events[0]).toEqual({
      type: 'job-started',
      renderId: 'render-1',
      totalFrames: 3
    })

    expect(events.at(-1)).toEqual({
      type: 'job-completed',
      renderId: 'render-1',
      completedFrames: 3,
      totalFrames: 3
    })
  })

  it('passes the render configuration to every frame', async () => {
    await startLocalRenderJob({
      renderId: 'render-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe',
      request,
      onEvent: () => undefined
    })

    expect(mockedStartLocalRender).toHaveBeenNthCalledWith(
      1,
      {
        blenderExecutablePath: 'C:\\Blender\\blender.exe',
        blendFilePath: 'C:\\Projects\\test.blend',
        sceneName: 'Scene',
        frame: 1,
        outputMode: 'scene-output',
        outputDirectory: 'C:\\Renders'
      },
      expect.any(Function)
    )
  })

  it('reports frame progress', async () => {
    const events: RenderEvent[] = []

    mockedStartLocalRender.mockImplementation(async (_renderRequest, onEvent) => {
      onEvent({
        type: 'frame-completed',
        scene: 'Scene',
        frame: 1,
        outputCount: 2
      })
    })

    await startLocalRenderJob({
      renderId: 'render-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe',
      request,
      onEvent: (event) => {
        events.push(event)
      }
    })

    const completedEvents = events.filter((event) => event.type === 'frame-completed')

    expect(completedEvents).toEqual([
      {
        type: 'frame-completed',
        renderId: 'render-1',
        scene: 'Scene',
        frame: 1,
        completedFrames: 1,
        totalFrames: 3,
        outputCount: 2
      },
      {
        type: 'frame-completed',
        renderId: 'render-1',
        scene: 'Scene',
        frame: 2,
        completedFrames: 2,
        totalFrames: 3,
        outputCount: 2
      },
      {
        type: 'frame-completed',
        renderId: 'render-1',
        scene: 'Scene',
        frame: 3,
        completedFrames: 3,
        totalFrames: 3,
        outputCount: 2
      }
    ])
  })

  it('forwards saved output events with the render ID', async () => {
    const events: RenderEvent[] = []

    mockedStartLocalRender.mockImplementation(async (renderRequest, onEvent) => {
      onEvent({
        type: 'output-saved',
        scene: renderRequest.sceneName,
        frame: renderRequest.frame,
        path: `C:\\Renders\\${renderRequest.frame}.exr`
      })
    })

    await startLocalRenderJob({
      renderId: 'render-1',
      blenderExecutablePath: 'C:\\Blender\\blender.exe',
      request,
      onEvent: (event) => {
        events.push(event)
      }
    })

    const outputEvents = events.filter((event) => event.type === 'output-saved')

    expect(outputEvents).toEqual([
      {
        type: 'output-saved',
        renderId: 'render-1',
        scene: 'Scene',
        frame: 1,
        path: 'C:\\Renders\\1.exr'
      },
      {
        type: 'output-saved',
        renderId: 'render-1',
        scene: 'Scene',
        frame: 2,
        path: 'C:\\Renders\\2.exr'
      },
      {
        type: 'output-saved',
        renderId: 'render-1',
        scene: 'Scene',
        frame: 3,
        path: 'C:\\Renders\\3.exr'
      }
    ])
  })

  it('stops rendering when a frame fails', async () => {
    mockedStartLocalRender.mockImplementation(async (renderRequest) => {
      if (renderRequest.frame === 2) {
        throw new Error('Blender render process failed.')
      }
    })

    await expect(
      startLocalRenderJob({
        renderId: 'render-1',
        blenderExecutablePath: 'C:\\Blender\\blender.exe',
        request,
        onEvent: () => undefined
      })
    ).rejects.toThrow('Blender render process failed.')

    expect(mockedStartLocalRender.mock.calls.map(([renderRequest]) => renderRequest.frame)).toEqual(
      [1, 2]
    )
  })
})
