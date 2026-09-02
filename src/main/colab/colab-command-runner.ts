export interface ColabCommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface ColabCommandExecutionOptions {
  environment?: Readonly<Record<string, string>>
}

export interface ColabInteractiveCommandOptions extends ColabCommandExecutionOptions {
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
}

export interface ColabInteractiveCommand {
  writeStdin(data: string): void
  closeStdin(): void
  kill(): void
  result: Promise<ColabCommandResult>
}

export interface ColabCommandRunner {
  isAvailable(): Promise<boolean>

  execute(
    args: readonly string[],
    options?: ColabCommandExecutionOptions
  ): Promise<ColabCommandResult>

  start(
    args: readonly string[],
    options?: ColabInteractiveCommandOptions
  ): Promise<ColabInteractiveCommand>
}
