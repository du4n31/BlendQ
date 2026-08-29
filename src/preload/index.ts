import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { BlenderInstallation, BlendProjectFile, BlendProjectInfo } from '../shared/types'

const api = {
  detectBlender: (): Promise<BlenderInstallation[]> => {
    return ipcRenderer.invoke('blender:detect')
  },

  selectBlendFile: (): Promise<BlendProjectFile | null> => {
    return ipcRenderer.invoke('project:select-file')
  },

  inspectBlendProject: (blendFilePath: string): Promise<BlendProjectInfo> => {
    return ipcRenderer.invoke('blender:inspect-project', blendFilePath)
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
