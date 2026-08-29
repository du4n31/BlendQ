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
