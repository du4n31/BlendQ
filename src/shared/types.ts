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

export interface RenderFrameRequest {
  blendFilePath: string
  blenderExecutablePath: string
  sceneName: string
  frame: number
  outputMode: RenderOutputMode
  outputDirectory: string
}

export interface StartLocalRenderRequest {
  blendFilePath: string
  sceneName: string
  frame: number
  outputMode: RenderOutputMode
  outputDirectory: string
}

export interface RenderStartedEvent {
  type: 'render-started'
  renderId: string
  scene: string
  frame: number
  outputMode: RenderOutputMode
}

export interface RenderOutputSavedEvent {
  type: 'output-saved'
  renderId: string
  scene: string
  frame: number
  path: string
}

export interface RenderFrameCompletedEvent {
  type: 'frame-completed'
  renderId: string
  scene: string
  frame: number
  outputCount: number
}

export interface RenderCompletedEvent {
  type: 'render-completed'
  renderId: string
  scene: string
  frame: number
}

export interface RenderErrorEvent {
  type: 'error'
  renderId: string
  message: string
}

export type RenderEvent =
  | RenderStartedEvent
  | RenderOutputSavedEvent
  | RenderFrameCompletedEvent
  | RenderCompletedEvent
  | RenderErrorEvent
