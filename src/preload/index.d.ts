import type { ElectronAPI } from '@electron-toolkit/preload'
import type { BlenderInstallation, OpenBlendProjectResult } from '../shared/types'

interface API {
  detectBlender: () => Promise<BlenderInstallation[]>
  openBlendProject: () => Promise<OpenBlendProjectResult | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
