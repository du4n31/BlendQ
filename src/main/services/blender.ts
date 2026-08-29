import { execFile } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { BlenderInstallation, BlendProjectInfo } from '../../shared/types'

const MINIMUM_BLENDER_MAJOR_VERSION = 5
const INSPECTION_RESULT_PREFIX = 'BLENDQ_INSPECTION_RESULT='
interface ParsedBlenderVersion {
  version: string
  major: number
  minor: number
  patch: number
  isLts: boolean
}

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
    execFile(executablePath, args, (error, stdout, stderr) => {
      if (error) {
        console.error('Blender process failed.', {
          executablePath,
          args,
          stderr
        })

        reject(error)
        return
      }

      resolve(stdout)
    })
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

  const result = JSON.parse(json) as {
    scenes: BlendProjectInfo['scenes']
  }

  return {
    filePath: blendFilePath,
    scenes: result.scenes
  }
}
