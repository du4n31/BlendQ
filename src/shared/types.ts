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

export interface BlendSceneInfo {
  name: string
  frameStart: number
  frameEnd: number
  frameStep: number
}

export interface BlendProjectInfo {
  filePath: string
  scenes: BlendSceneInfo[]
}

export interface OpenBlendProjectResult {
  file: BlendProjectFile
  info: BlendProjectInfo
}
