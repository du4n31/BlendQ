import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

import { electronAPI } from '@electron-toolkit/preload'

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

const api = {
  detectBlender: (): Promise<BlenderInstallation[]> => {
    return ipcRenderer.invoke('blender:detect')
  },

  detectColabEnvironment: (): Promise<ColabEnvironmentStatus> => {
    return ipcRenderer.invoke('colab:detect-environment')
  },

  listColabConnections: (): Promise<ColabConnectionSummary[]> => {
    return ipcRenderer.invoke('colab:list-connections')
  },

  addColabConnection: (request: AddColabConnectionRequest): Promise<ColabConnectionSummary> => {
    return ipcRenderer.invoke('colab:add-connection', request)
  },

  openBlendProject: (): Promise<OpenBlendProjectResult | null> => {
    return ipcRenderer.invoke('project:open')
  },

  selectRenderOutputDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('render:select-output-directory')
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
  },

  startColabAuthentication: (connectionId: string): Promise<void> => {
    return ipcRenderer.invoke('colab:start-authentication', connectionId)
  },

  submitColabAuthorizationCode: (connectionId: string, code: string): Promise<void> => {
    return ipcRenderer.invoke('colab:submit-authorization-code', connectionId, code)
  },

  cancelColabAuthentication: (connectionId: string): Promise<void> => {
    return ipcRenderer.invoke('colab:cancel-authentication', connectionId)
  },

  onColabAuthenticationEvent: (
    callback: (event: ColabAuthenticationEvent) => void
  ): (() => void) => {
    const listener = (
      _event: IpcRendererEvent,
      authenticationEvent: ColabAuthenticationEvent
    ): void => {
      callback(authenticationEvent)
    }

    ipcRenderer.on('colab:authentication-event', listener)

    return () => {
      ipcRenderer.removeListener('colab:authentication-event', listener)
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
