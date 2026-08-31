import type { BlenderInstallation } from '../../shared/types'
import { LocalBlenderWorker } from './local-blender-worker'
import type { RenderWorker } from './render-worker'
import type { RenderWorkerConfiguration } from './render-worker-configuration'

interface CreateRenderWorkerPoolOptions {
  configurations: RenderWorkerConfiguration[]
  blenderInstallation: BlenderInstallation
}

export function createRenderWorkerPool({
  configurations,
  blenderInstallation
}: CreateRenderWorkerPoolOptions): RenderWorker[] {
  return configurations.map((configuration) => {
    switch (configuration.source.type) {
      case 'local':
        return new LocalBlenderWorker({
          id: configuration.id,
          blenderExecutablePath: blenderInstallation.executablePath,
          overrides: configuration.overrides
        })

      case 'colab':
        throw new Error(`Colab worker "${configuration.id}" is not supported yet.`)
    }
  })
}
