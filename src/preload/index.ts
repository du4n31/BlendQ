import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BlenderInstallation, BlendProjectFile } from '../shared/types'

const api = {
  detectBlender: (): Promise<BlenderInstallation[]> => {
    return ipcRenderer.invoke('blender:detect')
  },

  selectBlendFile: (): Promise<BlendProjectFile | null> => {
    return ipcRenderer.invoke('project:select-file')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose preload APIs.', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
