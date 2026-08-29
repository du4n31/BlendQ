import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import type {
  BlenderInstallation,
  OpenBlendProjectResult,
  RenderEvent,
  StartLocalRenderRequest
} from '../shared/types'

const api = {
  detectBlender: (): Promise<BlenderInstallation[]> => {
    return ipcRenderer.invoke('blender:detect')
  },

  openBlendProject: (): Promise<OpenBlendProjectResult | null> => {
    return ipcRenderer.invoke('project:open')
  },

  startLocalRender: (request: StartLocalRenderRequest): Promise<string> => {
    return ipcRenderer.invoke('render:start-local', request)
  },

  onRenderEvent: (callback: (event: RenderEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, renderEvent: RenderEvent): void => {
      callback(renderEvent)
    }

    ipcRenderer.on('render:event', listener)

    return () => {
      ipcRenderer.removeListener('render:event', listener)
    }
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
