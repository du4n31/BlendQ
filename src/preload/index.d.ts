import type { ElectronAPI } from '@electron-toolkit/preload'

import type {
  AddColabConnectionRequest,
  BlenderInstallation,
  ColabConnectionSummary,
  ColabEnvironmentStatus,
  OpenBlendProjectResult,
  RenderEvent,
  StartLocalRenderRequest,
  ColabAuthenticationEvent
} from '../shared/types'

interface API {
  detectBlender: () => Promise<BlenderInstallation[]>

  detectColabEnvironment: () => Promise<ColabEnvironmentStatus>

  listColabConnections: () => Promise<ColabConnectionSummary[]>

  addColabConnection: (request: AddColabConnectionRequest) => Promise<ColabConnectionSummary>

  openBlendProject: () => Promise<OpenBlendProjectResult | null>

  selectRenderOutputDirectory: () => Promise<string | null>

  startLocalRender: (request: StartLocalRenderRequest) => Promise<string>

  onRenderEvent: (callback: (event: RenderEvent) => void) => () => void

  startColabAuthentication: (connectionId: string) => Promise<void>

  submitColabAuthorizationCode: (connectionId: string, code: string) => Promise<void>

  cancelColabAuthentication: (connectionId: string) => Promise<void>

  onColabAuthenticationEvent: (callback: (event: ColabAuthenticationEvent) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
