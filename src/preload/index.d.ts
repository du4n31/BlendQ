import { ElectronAPI } from '@electron-toolkit/preload'
import type { BlenderInstallation } from '../shared/types'

interface API {
  detectBlender: () => Promise<BlenderInstallation[]>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
