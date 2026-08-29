import { execFile } from 'node:child_process'
import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { BlenderInstallation } from '../../shared/types'

const MINIMUM_BLENDER_MAJOR_VERSION = 5

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

      if (!isSupportedBlenderVersion(version)) {
        continue
      }

      installations.push({
        executablePath,
        version
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

function isSupportedBlenderVersion(version: string): boolean {
  const match = version.match(/Blender (\d+)\.(\d+)/)

  if (!match) {
    return false
  }

  const major = Number(match[1])

  return major >= MINIMUM_BLENDER_MAJOR_VERSION
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
