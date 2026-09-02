import type {
  ColabCommandResult,
  ColabCommandRunner,
  ColabInteractiveCommand,
  ColabInteractiveCommandOptions
} from './colab-command-runner'

import type { ColabExecutionContext } from './colab-execution-context'

export interface ColabClientOptions {
  runner: ColabCommandRunner
  context: ColabExecutionContext
}

export class ColabClient {
  readonly #runner: ColabCommandRunner

  readonly #context: ColabExecutionContext

  constructor(options: ColabClientOptions) {
    this.#runner = options.runner
    this.#context = options.context
  }

  #createArguments(args: readonly string[]): string[] {
    if (args.length === 0) {
      throw new Error('Colab command arguments cannot be empty.')
    }

    return [
      '--auth',
      this.#context.authenticationStrategy,
      '--config',
      this.#context.sessionConfigPath,
      ...args
    ]
  }

  #createOptions(options: ColabInteractiveCommandOptions = {}): ColabInteractiveCommandOptions {
    return {
      ...options,

      environment: {
        ...options.environment,

        HOME: this.#context.authenticationHomeDirectory
      }
    }
  }

  async execute(args: readonly string[]): Promise<ColabCommandResult> {
    return this.#runner.execute(this.#createArguments(args), this.#createOptions())
  }

  async start(
    args: readonly string[],
    options: ColabInteractiveCommandOptions = {}
  ): Promise<ColabInteractiveCommand> {
    return this.#runner.start(this.#createArguments(args), this.#createOptions(options))
  }
}
