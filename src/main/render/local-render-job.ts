import type {
  RenderEvent,
  RenderFrameCompletedEvent,
  RenderFrameTask,
  StartLocalRenderRequest
} from '../../shared/types'
import { createFrameSequence } from './frame-range'
import { scheduleRenderTasks } from './render-scheduler'
import type { RenderWorker } from './render-worker'

interface StartLocalRenderJobOptions {
  renderId: string
  workers: RenderWorker[]
  request: StartLocalRenderRequest
  onEvent: (event: RenderEvent) => void
}

export async function startLocalRenderJob({
  renderId,
  workers,
  request,
  onEvent
}: StartLocalRenderJobOptions): Promise<void> {
  const frames = createFrameSequence(request.frameRange)

  const tasks: RenderFrameTask[] = frames.map((frame) => ({
    blendFilePath: request.blendFilePath,
    sceneName: request.sceneName,
    frame,
    outputMode: request.outputMode,
    outputDirectory: request.outputDirectory
  }))

  const totalFrames = tasks.length

  onEvent({
    type: 'job-started',
    renderId,
    totalFrames
  })

  let completedFrames = 0

  const outputCounts = new Map<RenderFrameTask, number>()

  await scheduleRenderTasks({
    tasks,
    workers,

    onTaskStarted: ({ task }) => {
      onEvent({
        type: 'frame-started',
        renderId,
        scene: task.sceneName,
        frame: task.frame,
        completedFrames,
        totalFrames
      })
    },

    onWorkerEvent: ({ task, event }) => {
      switch (event.type) {
        case 'output-saved':
          onEvent({
            ...event,
            renderId
          })
          break

        case 'frame-completed':
          outputCounts.set(task, event.outputCount)
          break

        case 'render-started':
        case 'render-completed':
        case 'error':
          break
      }
    },

    onTaskCompleted: ({ task }) => {
      completedFrames += 1

      const frameCompletedEvent: RenderFrameCompletedEvent = {
        type: 'frame-completed',
        renderId,
        scene: task.sceneName,
        frame: task.frame,
        completedFrames,
        totalFrames,
        outputCount: outputCounts.get(task) ?? 0
      }

      onEvent(frameCompletedEvent)

      outputCounts.delete(task)
    }
  })

  onEvent({
    type: 'job-completed',
    renderId,
    completedFrames,
    totalFrames
  })
}
