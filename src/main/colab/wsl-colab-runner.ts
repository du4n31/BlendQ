import type { ColabCommandResult, ColabCommandRunner } from './colab-command-runner'

import { WslService } from '../wsl/wsl-service'

export interface WslColabRunnerOptions {
  distribution: string
  wslService?: WslService
}

export class WslColabRunner implements ColabCommandRunner {
  readonly #distribution: string
  readonly #wslService: WslService

  #executablePath: string | null = null

  constructor(options: WslColabRunnerOptions) {
    if (options.distribution.trim().length === 0) {
      throw new Error('WSL distribution name cannot be empty.')
    }

    this.#distribution = options.distribution

    this.#wslService = options.wslService ?? new WslService()
  }

  async #findExecutablePath(): Promise<string | null> {
    if (this.#executablePath) {
      return this.#executablePath
    }

    const result = await this.#wslService.execute(this.#distribution, 'bash', [
      '-lc',
      'command -v colab'
    ])

    if (result.exitCode !== 0) {
      return null
    }

    const executablePath = result.stdout.trim()

    if (executablePath.length === 0 || !executablePath.startsWith('/')) {
      return null
    }

    this.#executablePath = executablePath

    return executablePath
  }

  async isAvailable(): Promise<boolean> {
    if (!(await this.#wslService.isAvailable())) {
      return false
    }

    try {
      const executablePath = await this.#findExecutablePath()

      if (!executablePath) {
        return false
      }

      const result = await this.#wslService.execute(this.#distribution, executablePath, ['version'])

      return result.exitCode === 0
    } catch {
      return false
    }
  }

  async execute(args: readonly string[]): Promise<ColabCommandResult> {
    const executablePath = await this.#findExecutablePath()

    if (!executablePath) {
      throw new Error('Google Colab CLI executable was not found in the WSL environment.')
    }

    const result = await this.#wslService.execute(this.#distribution, executablePath, args)

    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr
    }
  }
}
