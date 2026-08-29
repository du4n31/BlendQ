import type {
  RenderEvent,
  RenderFrameCompletedEvent,
  StartLocalRenderRequest
} from '../../shared/types'
import { startLocalRender } from '../services/blender'
import { createFrameSequence } from './frame-range'

interface StartLocalRenderJobOptions {
  renderId: string
  blenderExecutablePath: string
  request: StartLocalRenderRequest
  onEvent: (event: RenderEvent) => void
}

export async function startLocalRenderJob({
  renderId,
  blenderExecutablePath,
  request,
  onEvent
}: StartLocalRenderJobOptions): Promise<void> {
  const frames = createFrameSequence(request.frameRange)

  const totalFrames = frames.length

  onEvent({
    type: 'job-started',
    renderId,
    totalFrames
  })

  let completedFrames = 0

  for (const frame of frames) {
    onEvent({
      type: 'frame-started',
      renderId,
      scene: request.sceneName,
      frame,
      completedFrames,
      totalFrames
    })

    let frameOutputCount = 0

    await startLocalRender(
      {
        blenderExecutablePath,
        blendFilePath: request.blendFilePath,
        sceneName: request.sceneName,
        frame,
        outputMode: request.outputMode,
        outputDirectory: request.outputDirectory
      },
      (blenderEvent) => {
        switch (blenderEvent.type) {
          case 'output-saved':
            onEvent({
              ...blenderEvent,
              renderId
            })
            break

          case 'frame-completed':
            frameOutputCount = blenderEvent.outputCount
            break

          case 'render-started':
          case 'render-completed':
          case 'error':
            break
        }
      }
    )

    completedFrames += 1

    const frameCompletedEvent: RenderFrameCompletedEvent = {
      type: 'frame-completed',
      renderId,
      scene: request.sceneName,
      frame,
      completedFrames,
      totalFrames,
      outputCount: frameOutputCount
    }

    onEvent(frameCompletedEvent)
  }

  onEvent({
    type: 'job-completed',
    renderId,
    completedFrames,
    totalFrames
  })
}
