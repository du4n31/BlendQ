import type { ElectronAPI } from '@electron-toolkit/preload'

import type {
  BlenderInstallation,
  OpenBlendProjectResult,
  RenderEvent,
  StartLocalRenderRequest,
  ColabEnvironmentStatus
} from '../shared/types'

interface API {
  detectBlender: () => Promise<BlenderInstallation[]>

  detectColabEnvironment: () => Promise<ColabEnvironmentStatus>

  openBlendProject: () => Promise<OpenBlendProjectResult | null>

  selectRenderOutputDirectory: () => Promise<string | null>

  startLocalRender: (request: StartLocalRenderRequest) => Promise<string>

  onRenderEvent: (callback: (event: RenderEvent) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
