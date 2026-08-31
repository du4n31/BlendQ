import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

import type { ColabCommandResult, ColabCommandRunner } from './colab-command-runner'

type SupportedNativePlatform = 'linux' | 'darwin'

export interface NativeColabRunnerOptions {
  platform?: NodeJS.Platform
  executablePath?: string
}

function isSupportedNativePlatform(platform: NodeJS.Platform): platform is SupportedNativePlatform {
  return platform === 'linux' || platform === 'darwin'
}

function executeProcess(
  executablePath: string,
  args: readonly string[]
): Promise<ColabCommandResult> {
  return new Promise((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams

    try {
      child = spawn(executablePath, [...args], {
        shell: false,
        windowsHide: true
      })
    } catch (error) {
      reject(error)
      return
    }

    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')

    child.stderr.setEncoding('utf8')

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })

    child.once('error', reject)

    child.once('close', (exitCode: number | null) => {
      resolve({
        exitCode: exitCode ?? -1,
        stdout,
        stderr
      })
    })
  })
}

export class NativeColabRunner implements ColabCommandRunner {
  readonly #platform: NodeJS.Platform

  readonly #executablePath: string

  constructor(options: NativeColabRunnerOptions = {}) {
    this.#platform = options.platform ?? process.platform

    this.#executablePath = options.executablePath ?? 'colab'
  }

  async isAvailable(): Promise<boolean> {
    if (!isSupportedNativePlatform(this.#platform)) {
      return false
    }

    try {
      const result = await executeProcess(this.#executablePath, ['version'])

      return result.exitCode === 0
    } catch {
      return false
    }
  }

  async execute(args: readonly string[]): Promise<ColabCommandResult> {
    if (!isSupportedNativePlatform(this.#platform)) {
      throw new Error(
        `Native Colab CLI execution is not supported on platform "${this.#platform}".`
      )
    }

    return executeProcess(this.#executablePath, args)
  }
}
