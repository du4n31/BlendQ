import { execFile, spawn } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  BlenderInstallation,
  BlendProjectInfo,
  RenderFrameRequest,
  RenderOutputMode
} from '../../shared/types'
import * as z from 'zod'

interface BlenderRenderStartedEvent {
  type: 'render-started'
  scene: string
  frame: number
  outputMode: RenderOutputMode
}

interface BlenderRenderOutputSavedEvent {
  type: 'output-saved'
  scene: string
  frame: number
  path: string
}

interface BlenderRenderFrameCompletedEvent {
  type: 'frame-completed'
  scene: string
  frame: number
  outputCount: number
}

interface BlenderRenderCompletedEvent {
  type: 'render-completed'
  scene: string
  frame: number
}

interface BlenderRenderErrorEvent {
  type: 'error'
  message: string
}

export type BlenderRenderEvent =
  | BlenderRenderStartedEvent
  | BlenderRenderOutputSavedEvent
  | BlenderRenderFrameCompletedEvent
  | BlenderRenderCompletedEvent
  | BlenderRenderErrorEvent

const MINIMUM_BLENDER_MAJOR_VERSION = 5
const INSPECTION_RESULT_PREFIX = 'BLENDQ_INSPECTION_RESULT='
const RENDER_EVENT_PREFIX = 'BLENDQ:'
interface ParsedBlenderVersion {
  version: string
  major: number
  minor: number
  patch: number
  isLts: boolean
}

const compositorFileOutputItemSchema = z.object({
  name: z.string()
})

const compositorFileOutputSchema = z.object({
  name: z.string(),
  directory: z.string(),
  fileName: z.string(),
  fileFormat: z.string(),
  isMultilayer: z.boolean(),
  items: z.array(compositorFileOutputItemSchema)
})

const blendSceneInfoSchema = z.object({
  name: z.string(),

  frameStart: z.number().int(),
  frameEnd: z.number().int(),
  frameStep: z.number().int().positive(),

  renderEngine: z.string(),

  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    percentage: z.number().int().positive()
  }),

  sceneOutput: z.object({
    filepath: z.string(),
    fileFormat: z.string()
  }),

  compositor: z.object({
    enabled: z.boolean(),
    fileOutputs: z.array(compositorFileOutputSchema)
  })
})

const blendInspectionResultSchema = z.object({
  blenderVersion: z.string(),
  scenes: z.array(blendSceneInfoSchema)
})

const renderOutputModeSchema = z.enum(['scene-output', 'compositor-file-outputs'])

const renderEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('render-started'),
    scene: z.string(),
    frame: z.number().int(),
    outputMode: renderOutputModeSchema
  }),

  z.object({
    type: z.literal('output-saved'),
    scene: z.string(),
    frame: z.number().int(),
    path: z.string()
  }),

  z.object({
    type: z.literal('frame-completed'),
    scene: z.string(),
    frame: z.number().int(),
    outputCount: z.number().int().nonnegative()
  }),

  z.object({
    type: z.literal('render-completed'),
    scene: z.string(),
    frame: z.number().int()
  }),

  z.object({
    type: z.literal('error'),
    message: z.string()
  })
])

export async function detectBlenderInstallations(): Promise<BlenderInstallation[]> {
  const blenderFoundationPath = 'C:\\Program Files\\Blender Foundation'

  let entries

  try {
    entries = await readdir(blenderFoundationPath, {
      withFileTypes: true
    })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return []
    }

    console.error(
      `Failed to read Blender installation directory "${blenderFoundationPath}".`,
      error
    )

    throw error
  }

  const blenderDirectories = entries.filter((entry) => {
    return entry.isDirectory() && entry.name.startsWith('Blender ')
  })

  const installations: BlenderInstallation[] = []

  for (const directory of blenderDirectories) {
    const executablePath = join(blenderFoundationPath, directory.name, 'blender.exe')

    try {
      await access(executablePath)

      const version = await getBlenderVersion(executablePath)
      const parsedVersion = parseBlenderVersion(version)

      if (!parsedVersion) {
        continue
      }

      if (parsedVersion.major < MINIMUM_BLENDER_MAJOR_VERSION) {
        continue
      }

      installations.push({
        executablePath,
        ...parsedVersion
      })
    } catch (error) {
      console.warn(`Failed to inspect Blender installation at "${executablePath}".`, error)
    }
  }

  return installations
}

function executeBlender(executablePath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      executablePath,
      args,
      {
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024
      },
      (error, stdout, stderr) => {
        if (error) {
          console.error('Blender process failed.', {
            executablePath,
            stderr,
            error
          })

          reject(error)
          return
        }

        resolve(stdout)
      }
    )
  })
}

async function getBlenderVersion(executablePath: string): Promise<string> {
  const stdout = await executeBlender(executablePath, ['--version'])
  return stdout.split(/\r?\n/)[0]
}

function parseBlenderVersion(version: string): ParsedBlenderVersion | null {
  const match = version.match(/^Blender (\d+)\.(\d+)\.(\d+)(?:\s+(LTS))?/)

  if (!match) {
    return null
  }

  return {
    version,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    isLts: match[4] === 'LTS'
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}

export async function inspectBlendProject(
  blenderExecutablePath: string,
  blendFilePath: string
): Promise<BlendProjectInfo> {
  const scriptPath = join(process.cwd(), 'src', 'blender', 'inspect_project.py')

  const stdout = await executeBlender(blenderExecutablePath, [
    '--background',
    '--disable-autoexec',
    blendFilePath,
    '--python',
    scriptPath,
    '--python-exit-code',
    '1'
  ])

  const resultLine = stdout.split(/\r?\n/).find((line) => line.startsWith(INSPECTION_RESULT_PREFIX))

  if (!resultLine) {
    throw new Error('Blender did not return a project inspection result.')
  }

  const json = resultLine.slice(INSPECTION_RESULT_PREFIX.length)

  let data: unknown

  try {
    data = JSON.parse(json)
  } catch (error) {
    console.error('Failed to parse Blender inspection result as JSON.', error)

    throw new Error('Blender returned an invalid project inspection result.')
  }

  const result = blendInspectionResultSchema.safeParse(data)

  if (!result.success) {
    console.error('Blender returned an unexpected project inspection result.', result.error)

    throw new Error('Blender returned an invalid project inspection result.')
  }

  return {
    filePath: blendFilePath,
    blenderVersion: result.data.blenderVersion,
    scenes: result.data.scenes
  }
}

export async function startLocalRender(
  request: RenderFrameRequest,
  onEvent: (event: BlenderRenderEvent) => void
): Promise<void> {
  const scriptPath = join(process.cwd(), 'src', 'blender', 'render.py')

  const args = [
    '--background',
    '--disable-autoexec',
    request.blendFilePath,
    '--python',
    scriptPath,
    '--python-exit-code',
    '1',
    '--',
    '--scene',
    request.sceneName,
    '--frame',
    String(request.frame),
    '--output-mode',
    request.outputMode,
    '--output-dir',
    request.outputDirectory
  ]

  await new Promise<void>((resolve, reject) => {
    const child = spawn(request.blenderExecutablePath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdoutBuffer = ''
    let stderrBuffer = ''
    let protocolError: Error | null = null

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk

      const lines = stdoutBuffer.split(/\r?\n/)

      stdoutBuffer = lines.pop() ?? ''

      for (const line of lines) {
        try {
          const event = parseRenderEventLine(line)

          if (event) {
            onEvent(event)
          }
        } catch (error) {
          protocolError = normalizeError(error)

          console.error('Failed to process Blender render protocol event.', protocolError)

          child.kill()
          break
        }
      }
    })

    child.stderr.on('data', (chunk: string) => {
      stderrBuffer += chunk

      const maxStderrLength = 64 * 1024

      if (stderrBuffer.length > maxStderrLength) {
        stderrBuffer = stderrBuffer.slice(-maxStderrLength)
      }
    })

    child.on('error', (error) => {
      console.error('Failed to start Blender render process.', {
        executablePath: request.blenderExecutablePath,
        error
      })

      reject(error)
    })

    child.on('close', (code, signal) => {
      if (stdoutBuffer) {
        try {
          const event = parseRenderEventLine(stdoutBuffer)

          if (event) {
            onEvent(event)
          }
        } catch (error) {
          protocolError ??= normalizeError(error)
        }
      }

      if (protocolError) {
        reject(protocolError)
        return
      }

      if (code !== 0) {
        console.error('Blender render process exited unsuccessfully.', {
          code,
          signal,
          stderr: stderrBuffer
        })

        reject(new Error(`Blender render process exited with code ${code ?? 'unknown'}.`))

        return
      }

      resolve()
    })
  })
}

function parseRenderEventLine(line: string): BlenderRenderEvent | null {
  if (!line.startsWith(RENDER_EVENT_PREFIX)) {
    return null
  }

  const json = line.slice(RENDER_EVENT_PREFIX.length)

  let data: unknown

  try {
    data = JSON.parse(json)
  } catch (error) {
    console.error('Failed to parse Blender render event as JSON.', {
      line,
      error
    })

    throw new Error('Blender returned an invalid render event.')
  }

  const result = renderEventSchema.safeParse(data)

  if (!result.success) {
    console.error('Blender returned an unexpected render event.', result.error)

    throw new Error('Blender returned an invalid render event.')
  }

  return result.data
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error(String(error))
}
