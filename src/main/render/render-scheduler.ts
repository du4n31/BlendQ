import type { RenderFrameTask } from '../../shared/types'
import type { ExplicitRenderPlan, RenderPlan } from './render-plan'
import { validateExplicitRenderPlan } from './render-plan'
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
  plan?: RenderPlan

  onTaskStarted?: (context: RenderTaskContext) => void

  onWorkerEvent?: (context: RenderWorkerEventContext) => void

  onTaskCompleted?: (context: RenderTaskContext) => void
}

export async function scheduleRenderTasks({
  tasks,
  workers,
  plan = { mode: 'dynamic' },
  onTaskStarted,
  onWorkerEvent,
  onTaskCompleted
}: ScheduleRenderTasksOptions): Promise<void> {
  if (workers.length === 0) {
    throw new Error('At least one render worker is required.')
  }

  if (plan.mode === 'explicit') {
    await scheduleExplicitRenderPlan({
      tasks,
      workers,
      plan,
      onTaskStarted,
      onWorkerEvent,
      onTaskCompleted
    })

    return
  }

  await scheduleDynamically({
    tasks,
    workers,
    onTaskStarted,
    onWorkerEvent,
    onTaskCompleted
  })
}

async function scheduleDynamically({
  tasks,
  workers,
  onTaskStarted,
  onWorkerEvent,
  onTaskCompleted
}: Omit<ScheduleRenderTasksOptions, 'plan'>): Promise<void> {
  let nextTaskIndex = 0

  async function runWorker(worker: RenderWorker): Promise<void> {
    while (true) {
      const taskIndex = nextTaskIndex

      nextTaskIndex += 1

      const task = tasks[taskIndex]

      if (!task) {
        return
      }

      await runTask({
        worker,
        task,
        onTaskStarted,
        onWorkerEvent,
        onTaskCompleted
      })
    }
  }

  await Promise.all(workers.map((worker) => runWorker(worker)))
}

async function scheduleExplicitRenderPlan({
  tasks,
  workers,
  plan,
  onTaskStarted,
  onWorkerEvent,
  onTaskCompleted
}: {
  tasks: RenderFrameTask[]
  workers: RenderWorker[]
  plan: ExplicitRenderPlan

  onTaskStarted?: (context: RenderTaskContext) => void

  onWorkerEvent?: (context: RenderWorkerEventContext) => void

  onTaskCompleted?: (context: RenderTaskContext) => void
}): Promise<void> {
  validateExplicitRenderPlan({
    selectedFrames: tasks.map((task) => task.frame),
    workerIds: workers.map((worker) => worker.id),
    plan
  })

  const workersById = new Map(workers.map((worker) => [worker.id, worker]))

  const tasksByFrame = new Map(tasks.map((task) => [task.frame, task]))

  await Promise.all(
    plan.assignments.map(async (assignment) => {
      const worker = workersById.get(assignment.workerId)

      if (!worker) {
        throw new Error(`Render worker "${assignment.workerId}" is unavailable.`)
      }

      for (const frame of assignment.frames) {
        const task = tasksByFrame.get(frame)

        if (!task) {
          throw new Error(`Render task for frame ${frame} is unavailable.`)
        }

        await runTask({
          worker,
          task,
          onTaskStarted,
          onWorkerEvent,
          onTaskCompleted
        })
      }
    })
  )
}

async function runTask({
  worker,
  task,
  onTaskStarted,
  onWorkerEvent,
  onTaskCompleted
}: {
  worker: RenderWorker
  task: RenderFrameTask

  onTaskStarted?: (context: RenderTaskContext) => void

  onWorkerEvent?: (context: RenderWorkerEventContext) => void

  onTaskCompleted?: (context: RenderTaskContext) => void
}): Promise<void> {
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
