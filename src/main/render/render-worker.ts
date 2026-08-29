import type { RenderFrameTask } from '../../shared/types'
import type { RenderWorkerEvent } from './render-worker-event'

export interface RenderWorker {
  id: string
  type: 'local' | 'colab'

  renderFrame(task: RenderFrameTask, onEvent: (event: RenderWorkerEvent) => void): Promise<void>
}
