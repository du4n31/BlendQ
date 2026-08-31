import { spawn } from 'node:child_process'

export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export interface WslDistribution {
  name: string
  isDefault: boolean
}

export interface WslServiceOptions {
  platform?: NodeJS.Platform
  executablePath?: string
}

function decodeProcessOutput(chunks: readonly Buffer[]): string {
  if (chunks.length === 0) {
    return ''
  }

  const buffer = Buffer.concat(chunks)

  if (buffer.length === 0) {
    return ''
  }

  const sampleLength = Math.min(buffer.length, 100)

  let nullByteCount = 0

  for (let index = 1; index < sampleLength; index += 2) {
    if (buffer[index] === 0) {
      nullByteCount += 1
    }
  }

  const sampledPairs = Math.floor(sampleLength / 2)

  const looksLikeUtf16Le = sampledPairs > 0 && nullByteCount / sampledPairs > 0.5

  return buffer.toString(looksLikeUtf16Le ? 'utf16le' : 'utf8').replace(/^\uFEFF/, '')
}

function executeProcess(executablePath: string, args: readonly string[]): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, [...args], {
      shell: false,
      windowsHide: true
    })

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
        stdout: decodeProcessOutput(stdoutChunks),
        stderr: decodeProcessOutput(stderrChunks)
      })
    })
  })
}

export class WslService {
  readonly #platform: NodeJS.Platform

  readonly #executablePath: string

  constructor(options: WslServiceOptions = {}) {
    this.#platform = options.platform ?? process.platform

    this.#executablePath = options.executablePath ?? 'wsl.exe'
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
    if (this.#platform !== 'win32') {
      throw new Error('WSL is only available on Windows.')
    }

    const result = await executeProcess(this.#executablePath, ['--list', '--quiet'])

    if (result.exitCode !== 0) {
      throw new Error(result.stderr.trim() || 'Failed to list WSL distributions.')
    }

    const names = result.stdout
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
      .filter(
        (value) =>
          !value.startsWith('Default Distribution:') && !value.startsWith('Default Version:')
      )

    if (names.length === 0) {
      return []
    }

    const defaultResult = await executeProcess(this.#executablePath, ['--status'])

    const defaultName = extractDefaultDistributionName(defaultResult.stdout)

    return names.map((name) => ({
      name,
      isDefault: defaultName === name
    }))
  }

  async execute(
    distribution: string,
    command: string,
    args: readonly string[]
  ): Promise<CommandResult> {
    if (this.#platform !== 'win32') {
      throw new Error('WSL is only available on Windows.')
    }

    if (distribution.trim().length === 0) {
      throw new Error('WSL distribution name cannot be empty.')
    }

    if (command.trim().length === 0) {
      throw new Error('WSL command cannot be empty.')
    }

    return executeProcess(this.#executablePath, [
      '--distribution',
      distribution,
      '--',
      command,
      ...args
    ])
  }

  async getHomeDirectory(distribution: string): Promise<string> {
    const result = await this.execute(distribution, 'sh', ['-lc', 'printf %s "$HOME"'])

    if (result.exitCode !== 0) {
      throw new Error(result.stderr.trim() || 'Failed to detect the WSL home directory.')
    }

    const homeDirectory = result.stdout.trim()

    if (homeDirectory.length === 0 || !homeDirectory.startsWith('/')) {
      throw new Error('WSL returned an invalid home directory.')
    }

    return homeDirectory
  }
}

function extractDefaultDistributionName(stdout: string): string | null {
  const match = stdout.match(/^Default Distribution:\s*(.+)$/im)

  return match?.[1]?.trim() ?? null
}
