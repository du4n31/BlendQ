import { execFile } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { BlenderInstallation } from '../../shared/types'

const MINIMUM_BLENDER_MAJOR_VERSION = 5

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

function getBlenderVersion(executablePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(executablePath, ['--version'], (error, stdout) => {
      if (error) {
        reject(error)
        return
      }

      const firstLine = stdout.split(/\r?\n/)[0]
      resolve(firstLine)
    })
  })
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
