import type { RenderFrameTask, RenderOverrides } from '../../shared/types'
import { startLocalRender } from '../services/blender'
import { resolveRenderWorkerOverrides } from './render-worker-configuration'
import type { RenderWorker } from './render-worker'
import type { RenderWorkerEvent } from './render-worker-event'

interface LocalBlenderWorkerOptions {
  id: string
  blenderExecutablePath: string
  overrides?: RenderOverrides
}

export class LocalBlenderWorker implements RenderWorker {
  readonly id: string
  readonly type = 'local' as const

  private readonly blenderExecutablePath: string
  private readonly overrides: RenderOverrides

  constructor({ id, blenderExecutablePath, overrides = {} }: LocalBlenderWorkerOptions) {
    this.id = id
    this.blenderExecutablePath = blenderExecutablePath
    this.overrides = overrides
  }

  async renderFrame(
    task: RenderFrameTask,
    onEvent: (event: RenderWorkerEvent) => void
  ): Promise<void> {
    const resolvedOverrides = resolveRenderWorkerOverrides(task.overrides ?? {}, this.overrides)

    const request = {
      ...task,
      blenderExecutablePath: this.blenderExecutablePath
    }

    if (Object.keys(resolvedOverrides).length > 0) {
      request.overrides = resolvedOverrides
    } else {
      delete request.overrides
    }

    await startLocalRender(request, onEvent)
  }
}
