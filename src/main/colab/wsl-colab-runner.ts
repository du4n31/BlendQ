import type {
  ColabCommandExecutionOptions,
  ColabCommandResult,
  ColabCommandRunner,
  ColabInteractiveCommand,
  ColabInteractiveCommandOptions
} from './colab-command-runner'

import { WslService } from '../wsl/wsl-service'

export interface WslColabRunnerOptions {
  distribution: string
  wslService?: WslService
}

function createEnvironmentArguments(environment: Readonly<Record<string, string>>): string[] {
  return Object.entries(environment).map(([name, value]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Invalid environment variable name "${name}".`)
    }

    return `${name}=${value}`
  })
}

export class WslColabRunner implements ColabCommandRunner {
  readonly #distribution: string

  readonly #wslService: WslService

  #executablePath: string | null = null

  constructor(options: WslColabRunnerOptions) {
    if (options.distribution.trim().length === 0) {
      throw new Error('WSL distribution name cannot be empty.')
    }

    this.#distribution = options.distribution.trim()

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
    const executablePath = await this.#findExecutablePath()

    if (!executablePath) {
      throw new Error('Google Colab CLI executable was not found in the WSL environment.')
    }

    const environment = options.environment

    if (environment === undefined || Object.keys(environment).length === 0) {
      return this.#wslService.start(this.#distribution, executablePath, args, {
        onStdout: options.onStdout,

        onStderr: options.onStderr
      })
    }

    const environmentArguments = createEnvironmentArguments(environment)

    return this.#wslService.start(
      this.#distribution,
      'env',
      [...environmentArguments, executablePath, ...args],
      {
        onStdout: options.onStdout,

        onStderr: options.onStderr
      }
    )
  }
}
