import type { RenderFrameTask } from '../../shared/types'
import type { RenderWorker } from './render-worker'
import type { RenderWorkerEvent } from './render-worker-event'
interface RenderTaskContext {
  worker: RenderWorker
  task: RenderFrameTask
}

interface RenderWorkerEventContext extends RenderTaskContext {
  event: RenderWorkerEvent
}

interface ScheduleRenderTasksOptions {
  tasks: RenderFrameTask[]
  workers: RenderWorker[]

  onTaskStarted?: (context: RenderTaskContext) => void

  onWorkerEvent?: (context: RenderWorkerEventContext) => void

  onTaskCompleted?: (context: RenderTaskContext) => void
}

export async function scheduleRenderTasks({
  tasks,
  workers,
  onTaskStarted,
  onWorkerEvent,
  onTaskCompleted
}: ScheduleRenderTasksOptions): Promise<void> {
  if (workers.length === 0) {
    throw new Error('At least one render worker is required.')
  }

  let nextTaskIndex = 0

  async function runWorker(worker: RenderWorker): Promise<void> {
    while (true) {
      const taskIndex = nextTaskIndex

      nextTaskIndex += 1

      const task = tasks[taskIndex]

      if (!task) {
        return
      }

      onTaskStarted?.({
        worker,
        task
      })

      await worker.renderFrame(task, (event) => {
        onWorkerEvent?.({
          worker,
          task,
          event
        })
      })

      onTaskCompleted?.({
        worker,
        task
      })
    }
  }

  await Promise.all(workers.map((worker) => runWorker(worker)))
}
