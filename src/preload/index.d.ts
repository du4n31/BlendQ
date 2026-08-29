import { ElectronAPI } from '@electron-toolkit/preload'
import type { BlenderInstallation, BlendProjectFile } from '../shared/types'

interface API {
  detectBlender: () => Promise<BlenderInstallation[]>
  selectBlendFile: () => Promise<BlendProjectFile | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
