import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

import type {
  ColabCommandExecutionOptions,
  ColabCommandResult,
  ColabCommandRunner,
  ColabInteractiveCommand,
  ColabInteractiveCommandOptions
} from './colab-command-runner'

type SupportedNativePlatform = 'linux' | 'darwin'

export interface NativeColabRunnerOptions {
  platform?: NodeJS.Platform
  executablePath?: string
}

function isSupportedNativePlatform(platform: NodeJS.Platform): platform is SupportedNativePlatform {
  return platform === 'linux' || platform === 'darwin'
}

function createProcessEnvironment(
  environment: Readonly<Record<string, string>> | undefined
): NodeJS.ProcessEnv {
  if (environment === undefined) {
    return process.env
  }

  return {
    ...process.env,
    ...environment
  }
}

function startProcess(
  executablePath: string,
  args: readonly string[],
  options: ColabInteractiveCommandOptions = {}
): ColabInteractiveCommand {
  let child: ChildProcessWithoutNullStreams

  try {
    child = spawn(executablePath, [...args], {
      shell: false,
      windowsHide: true,

      env: createProcessEnvironment(options.environment)
    })
  } catch (error) {
    return {
      writeStdin() {
        throw error
      },

      closeStdin() {
        // No process was started.
      },

      kill() {
        // No process was started.
      },

      result: Promise.reject(error)
    }
  }

  let stdout = ''
  let stderr = ''

  child.stdout.setEncoding('utf8')

  child.stderr.setEncoding('utf8')

  const result = new Promise<ColabCommandResult>((resolve, reject) => {
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
      options.onStdout?.(chunk)
    })

    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
      options.onStderr?.(chunk)
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

  return {
    writeStdin(data: string): void {
      if (child.stdin.destroyed) {
        throw new Error('Colab process stdin is not available.')
      }

      child.stdin.write(data)
    },

    closeStdin(): void {
      if (!child.stdin.destroyed) {
        child.stdin.end()
      }
    },

    kill(): void {
      if (!child.killed) {
        child.kill()
      }
    },

    result
  }
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
      const result = await this.execute(['version'])

      return result.exitCode === 0
    } catch {
      return false
    }
  }

  async execute(
    args: readonly string[],
    options: ColabCommandExecutionOptions = {}
  ): Promise<ColabCommandResult> {
    const command = await this.start(args, options)

    command.closeStdin()

    return command.result
  }

  async start(
    args: readonly string[],
    options: ColabInteractiveCommandOptions = {}
  ): Promise<ColabInteractiveCommand> {
    if (!isSupportedNativePlatform(this.#platform)) {
      throw new Error(
        `Native Colab CLI execution is not supported on platform "${this.#platform}".`
      )
    }

    return startProcess(this.#executablePath, args, options)
  }
}
