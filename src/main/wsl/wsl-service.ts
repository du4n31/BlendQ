import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface WslDistribution {
  name: string
  isDefault: boolean
}

export interface WslInteractiveCommandOptions {
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
}

export interface WslInteractiveCommand {
  writeStdin(data: string): void
  closeStdin(): void
  kill(): void
  result: Promise<CommandResult>
}

export interface WslServiceOptions {
  platform?: NodeJS.Platform
  executablePath?: string
}

function decodeProcessOutput(buffer: Buffer): string {
  if (buffer.length === 0) {
    return ''
  }

  const sampleLength = Math.min(buffer.length, 200)

  let oddByteCount = 0
  let oddNullByteCount = 0

  for (let index = 1; index < sampleLength; index += 2) {
    oddByteCount += 1

    if (buffer[index] === 0) {
      oddNullByteCount += 1
    }
  }

  const likelyUtf16 = oddByteCount > 0 && oddNullByteCount / oddByteCount > 0.5

  const decoded = likelyUtf16 ? buffer.toString('utf16le') : buffer.toString('utf8')

  return decoded.replace(/^\uFEFF/, '')
}

function executeProcess(executablePath: string, args: readonly string[]): Promise<CommandResult> {
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

    const stdoutChunks: Buffer[] = []

    const stderrChunks: Buffer[] = []

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    child.once('error', reject)

    child.once('close', (exitCode: number | null) => {
      resolve({
        exitCode: exitCode ?? -1,

        stdout: decodeProcessOutput(Buffer.concat(stdoutChunks)),

        stderr: decodeProcessOutput(Buffer.concat(stderrChunks))
      })
    })
  })
}

function startProcess(
  executablePath: string,
  args: readonly string[],
  options: WslInteractiveCommandOptions = {}
): WslInteractiveCommand {
  let child: ChildProcessWithoutNullStreams

  try {
    child = spawn(executablePath, [...args], {
      shell: false,
      windowsHide: true
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

  const result = new Promise<CommandResult>((resolve, reject) => {
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
        throw new Error('WSL process stdin is not available.')
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

export class WslService {
  readonly #platform: NodeJS.Platform

  readonly #executablePath: string

  constructor(options: WslServiceOptions = {}) {
    this.#platform = options.platform ?? process.platform

    this.#executablePath = options.executablePath ?? 'wsl.exe'
  }

  #assertWindows(): void {
    if (this.#platform !== 'win32') {
      throw new Error('WSL is only available on Windows.')
    }
  }

  #validateDistribution(distribution: string): string {
    const value = distribution.trim()

    if (value.length === 0) {
      throw new Error('WSL distribution name cannot be empty.')
    }

    return value
  }

  async isAvailable(): Promise<boolean> {
    if (this.#platform !== 'win32') {
      return false
    }

    try {
      const result = await executeProcess(this.#executablePath, ['--status'])

      return result.exitCode === 0
    } catch {
      return false
    }
  }

  async listDistributions(): Promise<WslDistribution[]> {
    this.#assertWindows()

    const listResult = await executeProcess(this.#executablePath, ['--list', '--quiet'])

    if (listResult.exitCode !== 0) {
      throw new Error(listResult.stderr.trim() || 'Failed to list WSL distributions.')
    }

    const statusResult = await executeProcess(this.#executablePath, ['--status'])

    const defaultMatch = statusResult.stdout.match(/Default Distribution:\s*(.+)/i)

    const defaultDistribution = defaultMatch?.[1]?.trim() ?? null

    const names = listResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => !/^Default Distribution:/i.test(line) && !/^Default Version:/i.test(line))

    return names.map((name) => ({
      name,
      isDefault: name === defaultDistribution
    }))
  }

  async getHomeDirectory(distribution: string): Promise<string> {
    this.#assertWindows()

    const normalizedDistribution = this.#validateDistribution(distribution)

    const result = await this.execute(normalizedDistribution, 'sh', ['-lc', 'printf %s "$HOME"'])

    if (result.exitCode !== 0) {
      throw new Error(result.stderr.trim() || 'Failed to detect the WSL home directory.')
    }

    const homeDirectory = result.stdout.trim()

    if (homeDirectory.length === 0 || !homeDirectory.startsWith('/')) {
      throw new Error('WSL returned an invalid home directory.')
    }

    return homeDirectory
  }

  async execute(
    distribution: string,
    command: string,
    args: readonly string[] = []
  ): Promise<CommandResult> {
    this.#assertWindows()

    const normalizedDistribution = this.#validateDistribution(distribution)

    const normalizedCommand = command.trim()

    if (normalizedCommand.length === 0) {
      throw new Error('WSL command cannot be empty.')
    }

    return executeProcess(this.#executablePath, [
      '--distribution',
      normalizedDistribution,
      '--',
      normalizedCommand,
      ...args
    ])
  }

  start(
    distribution: string,
    command: string,
    args: readonly string[] = [],
    options: WslInteractiveCommandOptions = {}
  ): WslInteractiveCommand {
    this.#assertWindows()

    const normalizedDistribution = this.#validateDistribution(distribution)

    const normalizedCommand = command.trim()

    if (normalizedCommand.length === 0) {
      throw new Error('WSL command cannot be empty.')
    }

    return startProcess(
      this.#executablePath,
      ['--distribution', normalizedDistribution, '--', normalizedCommand, ...args],
      options
    )
  }
}
