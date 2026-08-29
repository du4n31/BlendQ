import type { RenderFrameTask } from '../../shared/types'
import { startLocalRender } from '../services/blender'
import type { RenderWorker } from './render-worker'
import type { RenderWorkerEvent } from './render-worker-event'

interface LocalBlenderWorkerOptions {
  id: string
  blenderExecutablePath: string
}

export class LocalBlenderWorker implements RenderWorker {
  readonly id: string
  readonly type = 'local' as const

  private readonly blenderExecutablePath: string

  constructor({ id, blenderExecutablePath }: LocalBlenderWorkerOptions) {
    this.id = id
    this.blenderExecutablePath = blenderExecutablePath
  }

  async renderFrame(
    task: RenderFrameTask,
    onEvent: (event: RenderWorkerEvent) => void
  ): Promise<void> {
    await startLocalRender(
      {
        ...task,
        blenderExecutablePath: this.blenderExecutablePath
      },
      onEvent
    )
  }
}
