export interface BlenderInstallation {
  executablePath: string
  version: string
  major: number
  minor: number
  patch: number
  isLts: boolean
}

export interface BlendProjectFile {
  name: string
  path: string
}

export interface CompositorFileOutputItem {
  name: string
}

export interface CompositorFileOutput {
  name: string
  directory: string
  fileName: string
  fileFormat: string
  isMultilayer: boolean
  items: CompositorFileOutputItem[]
}

export interface BlendSceneInfo {
  name: string

  frameStart: number
  frameEnd: number
  frameStep: number

  renderEngine: string

  resolution: {
    width: number
    height: number
    percentage: number
  }

  sceneOutput: {
    filepath: string
    fileFormat: string
  }

  compositor: {
    enabled: boolean
    fileOutputs: CompositorFileOutput[]
  }
}

export interface BlendProjectInfo {
  filePath: string
  blenderVersion: string
  scenes: BlendSceneInfo[]
}

export interface OpenBlendProjectResult {
  file: BlendProjectFile
  info: BlendProjectInfo
}

export type RenderOutputMode = 'scene-output' | 'compositor-file-outputs'

export interface FrameRange {
  start: number
  end: number
  step: number
}

export type LocalWorkerSettings =
  | {
      mode: 'off'
    }
  | {
      mode: 'automatic'
    }
  | {
      mode: 'manual'
      workerCount: number
    }

export interface RenderResolutionOverrides {
  width?: number
  height?: number
  percentage?: number
}

export interface RenderOverrides {
  renderEngine?: string
  outputFormat?: string
  resolution?: RenderResolutionOverrides
  samples?: number
}

export interface RenderFrameTask {
  blendFilePath: string
  sceneName: string
  frame: number
  outputMode: RenderOutputMode
  outputDirectory: string
  overrides?: RenderOverrides
}

export interface RenderFrameRequest extends RenderFrameTask {
  blenderExecutablePath: string
}

export interface StartLocalRenderRequest {
  blendFilePath: string
  sceneName: string
  frameRange: FrameRange
  outputMode: RenderOutputMode
  outputDirectory: string
  localWorkerSettings?: LocalWorkerSettings
}

export interface RenderJobStartedEvent {
  type: 'job-started'
  renderId: string
  totalFrames: number
}

export interface RenderFrameStartedEvent {
  type: 'frame-started'
  renderId: string
  workerId: string
  scene: string
  frame: number
  completedFrames: number
  totalFrames: number
}

export interface RenderOutputSavedEvent {
  type: 'output-saved'
  renderId: string
  workerId: string
  scene: string
  frame: number
  path: string
}

export interface RenderFrameCompletedEvent {
  type: 'frame-completed'
  renderId: string
  workerId: string
  scene: string
  frame: number
  completedFrames: number
  totalFrames: number
  outputCount: number
}

export interface RenderJobCompletedEvent {
  type: 'job-completed'
  renderId: string
  completedFrames: number
  totalFrames: number
}

export interface RenderErrorEvent {
  type: 'error'
  renderId: string
  message: string
}

export type RenderEvent =
  | RenderJobStartedEvent
  | RenderFrameStartedEvent
  | RenderOutputSavedEvent
  | RenderFrameCompletedEvent
  | RenderJobCompletedEvent
  | RenderErrorEvent

export type ColabEnvironmentStatus =
  | {
      state: 'available'
      version: string
    }
  | {
      state: 'cli-missing'
      message: string
    }
  | {
      state: 'runner-unavailable'
      message: string
    }
  | {
      state: 'error'
      message: string
    }

export type ColabAuthenticationStrategy = 'oauth2' | 'adc'

export interface AddColabConnectionRequest {
  id: string
  displayName: string
  authenticationStrategy: ColabAuthenticationStrategy
}

export interface ColabConnectionSummary {
  id: string
  displayName: string
  authenticationStrategy: ColabAuthenticationStrategy

  runtime:
    | {
        type: 'native'
      }
    | {
        type: 'wsl'
        distribution: string
      }
}

export type ColabAuthenticationEvent =
  | {
      type: 'authorization-started'
      connectionId: string
    }
  | {
      type: 'authorization-code-requested'
      connectionId: string
    }
  | {
      type: 'authenticated'
      connectionId: string
    }
  | {
      type: 'cancelled'
      connectionId: string
    }
  | {
      type: 'error'
      connectionId: string
      message: string
    }
