export interface ColabCommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface ColabCommandRunner {
  isAvailable(): Promise<boolean>

  execute(args: readonly string[]): Promise<ColabCommandResult>
}
