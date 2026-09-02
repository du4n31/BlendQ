import { describe, expect, it, vi } from 'vitest'

import type { WslInteractiveCommand, WslService } from '../wsl/wsl-service'

import { WslColabRunner } from './wsl-colab-runner'

function createInteractiveCommand(result: {
  exitCode: number
  stdout: string
  stderr: string
}): WslInteractiveCommand {
  return {
    writeStdin: vi.fn(),

    closeStdin: vi.fn(),

    kill: vi.fn(),

    result: Promise.resolve(result)
  }
}

function createMockWslService(): WslService {
  return {
    isAvailable: vi.fn(),

    listDistributions: vi.fn(),

    execute: vi.fn(),

    start: vi.fn(),

    getHomeDirectory: vi.fn()
  } as unknown as WslService
}

describe('WslColabRunner', () => {
  it('rejects an empty distribution name', () => {
    expect(
      () =>
        new WslColabRunner({
          distribution: ''
        })
    ).toThrow('WSL distribution name cannot be empty.')
  })

  it('reports Colab as unavailable when WSL is unavailable', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.isAvailable).mockResolvedValue(false)

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(runner.isAvailable()).resolves.toBe(false)

    expect(wslService.execute).not.toHaveBeenCalled()

    expect(wslService.start).not.toHaveBeenCalled()
  })

  it('reports Colab as unavailable when the executable cannot be found', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.isAvailable).mockResolvedValue(true)

    vi.mocked(wslService.execute).mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: ''
    })

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(runner.isAvailable()).resolves.toBe(false)

    expect(wslService.execute).toHaveBeenCalledWith('Ubuntu-26.04', 'bash', [
      '-lc',
      'command -v colab'
    ])
  })

  it('reports Colab as available when the resolved executable works', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.isAvailable).mockResolvedValue(true)

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    const command = createInteractiveCommand({
      exitCode: 0,
      stdout: 'Google Colab CLI\n',
      stderr: ''
    })

    vi.mocked(wslService.start).mockReturnValue(command)

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(runner.isAvailable()).resolves.toBe(true)

    expect(wslService.execute).toHaveBeenCalledWith('Ubuntu-26.04', 'bash', [
      '-lc',
      'command -v colab'
    ])

    expect(wslService.start).toHaveBeenCalledWith(
      'Ubuntu-26.04',
      '/home/test/.local/bin/colab',
      ['version'],
      {
        onStdout: undefined,
        onStderr: undefined
      }
    )

    expect(command.closeStdin).toHaveBeenCalled()
  })

  it('executes arguments using the resolved Colab executable', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    const command = createInteractiveCommand({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    vi.mocked(wslService.start).mockReturnValue(command)

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(runner.execute(['example', '--flag'])).resolves.toEqual({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    expect(wslService.start).toHaveBeenCalledWith(
      'Ubuntu-26.04',
      '/home/test/.local/bin/colab',
      ['example', '--flag'],
      {
        onStdout: undefined,
        onStderr: undefined
      }
    )

    expect(command.closeStdin).toHaveBeenCalled()
  })

  it('executes Colab with controlled environment variables', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    const command = createInteractiveCommand({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    vi.mocked(wslService.start).mockReturnValue(command)

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(
      runner.execute(['sessions'], {
        environment: {
          HOME: '/home/test/.config/blendq/colab/personal/home'
        }
      })
    ).resolves.toEqual({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    expect(wslService.start).toHaveBeenCalledWith(
      'Ubuntu-26.04',
      'env',
      [
        'HOME=/home/test/.config/blendq/colab/personal/home',
        '/home/test/.local/bin/colab',
        'sessions'
      ],
      {
        onStdout: undefined,
        onStderr: undefined
      }
    )

    expect(command.closeStdin).toHaveBeenCalled()
  })

  it('supports multiple controlled environment variables', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    const command = createInteractiveCommand({
      exitCode: 0,
      stdout: '',
      stderr: ''
    })

    vi.mocked(wslService.start).mockReturnValue(command)

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await runner.execute(['sessions'], {
      environment: {
        HOME: '/isolated/home',

        BLENDQ_TEST: 'enabled'
      }
    })

    expect(wslService.start).toHaveBeenCalledWith(
      'Ubuntu-26.04',
      'env',
      ['HOME=/isolated/home', 'BLENDQ_TEST=enabled', '/home/test/.local/bin/colab', 'sessions'],
      {
        onStdout: undefined,
        onStderr: undefined
      }
    )
  })

  it('rejects invalid environment variable names', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(
      runner.execute(['sessions'], {
        environment: {
          'INVALID-NAME': 'value'
        }
      })
    ).rejects.toThrow('Invalid environment variable name "INVALID-NAME".')

    expect(wslService.start).not.toHaveBeenCalled()
  })

  it('streams stdout and stderr from an interactive command', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    const command = createInteractiveCommand({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    vi.mocked(wslService.start).mockReturnValue(command)

    const onStdout = vi.fn()

    const onStderr = vi.fn()

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await runner.start(['sessions'], {
      onStdout,
      onStderr
    })

    expect(wslService.start).toHaveBeenCalledWith(
      'Ubuntu-26.04',
      '/home/test/.local/bin/colab',
      ['sessions'],
      {
        onStdout,
        onStderr
      }
    )
  })

  it('returns the interactive command without closing stdin', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    const command = createInteractiveCommand({
      exitCode: 0,
      stdout: '',
      stderr: ''
    })

    vi.mocked(wslService.start).mockReturnValue(command)

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    const result = await runner.start(['sessions'])

    expect(result).toBe(command)

    expect(command.closeStdin).not.toHaveBeenCalled()
  })

  it('reuses the resolved executable path', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValueOnce({
      exitCode: 0,
      stdout: '/home/test/.local/bin/colab\n',
      stderr: ''
    })

    vi.mocked(wslService.start)
      .mockReturnValueOnce(
        createInteractiveCommand({
          exitCode: 0,
          stdout: 'done',
          stderr: ''
        })
      )
      .mockReturnValueOnce(
        createInteractiveCommand({
          exitCode: 0,
          stdout: 'done',
          stderr: ''
        })
      )

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await runner.execute(['version'])

    await runner.execute(['version'])

    expect(wslService.execute).toHaveBeenCalledTimes(1)

    expect(wslService.start).toHaveBeenCalledTimes(2)
  })

  it('rejects execution when Colab cannot be found', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute).mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: ''
    })

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(runner.execute(['version'])).rejects.toThrow(
      'Google Colab CLI executable was not found in the WSL environment.'
    )

    expect(wslService.start).not.toHaveBeenCalled()
  })
})
