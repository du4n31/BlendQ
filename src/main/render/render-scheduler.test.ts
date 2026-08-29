import { describe, expect, it, vi } from 'vitest'

import type { RenderFrameTask } from '../../shared/types'
import { scheduleRenderTasks } from './render-scheduler'
import type { RenderWorker } from './render-worker'

function createTask(frame: number): RenderFrameTask {
  return {
    blendFilePath: 'C:\\Projects\\test.blend',
    sceneName: 'Scene',
    frame,
    outputMode: 'scene-output',
    outputDirectory: 'C:\\Renders'
  }
}

describe('scheduleRenderTasks', () => {
  it('rejects scheduling without workers', async () => {
    await expect(
      scheduleRenderTasks({
        tasks: [createTask(1)],
        workers: []
      })
    ).rejects.toThrow('At least one render worker is required.')
  })

  it('renders every task with one worker', async () => {
    const renderFrame = vi.fn<RenderWorker['renderFrame']>(async () => undefined)

    const worker: RenderWorker = {
      id: 'local-1',
      type: 'local',
      renderFrame
    }

    await scheduleRenderTasks({
      tasks: [createTask(1), createTask(2), createTask(3)],
      workers: [worker]
    })

    expect(renderFrame).toHaveBeenCalledTimes(3)

    expect(renderFrame.mock.calls.map(([task]) => task.frame)).toEqual([1, 2, 3])
  })

  it('distributes tasks dynamically between multiple workers', async () => {
    const workerAFrames: number[] = []
    const workerBFrames: number[] = []

    let releaseWorkerA: (() => void) | undefined

    const workerAWait = new Promise<void>((resolve) => {
      releaseWorkerA = resolve
    })

    const workerA: RenderWorker = {
      id: 'worker-a',
      type: 'local',

      async renderFrame(task) {
        workerAFrames.push(task.frame)

        await workerAWait
      }
    }

    const workerB: RenderWorker = {
      id: 'worker-b',
      type: 'local',

      async renderFrame(task) {
        workerBFrames.push(task.frame)

        if (workerBFrames.length === 5) {
          releaseWorkerA?.()
        }
      }
    }

    const tasks = [
      createTask(1),
      createTask(2),
      createTask(3),
      createTask(4),
      createTask(5),
      createTask(6)
    ]

    await scheduleRenderTasks({
      tasks,
      workers: [workerA, workerB]
    })

    expect(workerAFrames).toEqual([1])

    expect(workerBFrames).toEqual([2, 3, 4, 5, 6])

    const renderedFrames = [...workerAFrames, ...workerBFrames].sort((a, b) => a - b)

    expect(renderedFrames).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('forwards worker events with their task and worker', async () => {
    const worker: RenderWorker = {
      id: 'local-1',
      type: 'local',

      async renderFrame(task, onEvent) {
        onEvent({
          type: 'output-saved',
          scene: task.sceneName,
          frame: task.frame,
          path: `C:\\Renders\\${task.frame}.exr`
        })
      }
    }

    const onWorkerEvent = vi.fn()

    await scheduleRenderTasks({
      tasks: [createTask(42)],
      workers: [worker],
      onWorkerEvent
    })

    expect(onWorkerEvent).toHaveBeenCalledWith({
      worker,
      task: createTask(42),
      event: {
        type: 'output-saved',
        scene: 'Scene',
        frame: 42,
        path: 'C:\\Renders\\42.exr'
      }
    })
  })

  it('does not mark a failed task as completed', async () => {
    const onTaskCompleted = vi.fn()

    const worker: RenderWorker = {
      id: 'local-1',
      type: 'local',

      async renderFrame() {
        throw new Error('Render worker failed.')
      }
    }

    await expect(
      scheduleRenderTasks({
        tasks: [createTask(1)],
        workers: [worker],
        onTaskCompleted
      })
    ).rejects.toThrow('Render worker failed.')

    expect(onTaskCompleted).not.toHaveBeenCalled()
  })
})
