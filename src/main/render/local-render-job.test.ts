import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RenderEvent, StartLocalRenderRequest } from '../../shared/types'
import { startLocalRenderJob } from './local-render-job'
import type { RenderWorker } from './render-worker'

const renderFrame = vi.fn<RenderWorker['renderFrame']>()

const worker: RenderWorker = {
  id: 'local-1',
  type: 'local',
  renderFrame
}

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

    renderFrame.mockResolvedValue(undefined)
  })

  it('renders every frame in the range sequentially', async () => {
    const events: RenderEvent[] = []

    await startLocalRenderJob({
      renderId: 'render-1',
      workers: [worker],
      request,
      onEvent: (event) => {
        events.push(event)
      }
    })

    expect(renderFrame).toHaveBeenCalledTimes(3)

    expect(renderFrame.mock.calls.map(([task]) => task.frame)).toEqual([1, 2, 3])

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
      workers: [worker],
      request,
      onEvent: () => undefined
    })

    expect(renderFrame).toHaveBeenNthCalledWith(
      1,
      {
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

    renderFrame.mockImplementation(async (task, onEvent) => {
      onEvent({
        type: 'frame-completed',
        scene: task.sceneName,
        frame: task.frame,
        outputCount: 2
      })
    })

    await startLocalRenderJob({
      renderId: 'render-1',
      workers: [worker],
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

    renderFrame.mockImplementation(async (task, onEvent) => {
      onEvent({
        type: 'output-saved',
        scene: task.sceneName,
        frame: task.frame,
        path: `C:\\Renders\\${task.frame}.exr`
      })
    })

    await startLocalRenderJob({
      renderId: 'render-1',
      workers: [worker],
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
    const events: RenderEvent[] = []

    renderFrame.mockImplementation(async (task) => {
      if (task.frame === 2) {
        throw new Error('Blender render process failed.')
      }
    })

    await expect(
      startLocalRenderJob({
        renderId: 'render-1',
        workers: [worker],
        request,
        onEvent: (event) => {
          events.push(event)
        }
      })
    ).rejects.toThrow('Blender render process failed.')

    expect(renderFrame.mock.calls.map(([task]) => task.frame)).toEqual([1, 2])

    expect(events.some((event) => event.type === 'job-completed')).toBe(false)
  })

  it('renders frames using multiple workers', async () => {
    const workerAFrames: number[] = []
    const workerBFrames: number[] = []

    const workerA: RenderWorker = {
      id: 'worker-a',
      type: 'local',

      async renderFrame(task, onEvent) {
        workerAFrames.push(task.frame)

        await new Promise((resolve) => setTimeout(resolve, 10))

        onEvent({
          type: 'frame-completed',
          scene: task.sceneName,
          frame: task.frame,
          outputCount: 1
        })
      }
    }

    const workerB: RenderWorker = {
      id: 'worker-b',
      type: 'local',

      async renderFrame(task, onEvent) {
        workerBFrames.push(task.frame)

        await new Promise((resolve) => setTimeout(resolve, 1))

        onEvent({
          type: 'frame-completed',
          scene: task.sceneName,
          frame: task.frame,
          outputCount: 1
        })
      }
    }

    const events: RenderEvent[] = []

    await startLocalRenderJob({
      renderId: 'render-1',
      workers: [workerA, workerB],
      request: {
        ...request,
        frameRange: {
          start: 1,
          end: 6,
          step: 1
        }
      },
      onEvent: (event) => {
        events.push(event)
      }
    })

    const renderedFrames = [...workerAFrames, ...workerBFrames].sort((a, b) => a - b)

    expect(renderedFrames).toEqual([1, 2, 3, 4, 5, 6])

    expect(workerAFrames.length).toBeGreaterThan(0)

    expect(workerBFrames.length).toBeGreaterThan(0)

    const completedEvents = events.filter((event) => event.type === 'frame-completed')

    expect(completedEvents).toHaveLength(6)

    expect(events.at(-1)).toEqual({
      type: 'job-completed',
      renderId: 'render-1',
      completedFrames: 6,
      totalFrames: 6
    })
  })
})
