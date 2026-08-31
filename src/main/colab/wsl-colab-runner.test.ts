import { describe, expect, it, vi } from 'vitest'

import type { WslService } from '../wsl/wsl-service'
import { WslColabRunner } from './wsl-colab-runner'

function createMockWslService(): WslService {
  return {
    isAvailable: vi.fn(),
    listDistributions: vi.fn(),
    execute: vi.fn()
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

    vi.mocked(wslService.execute)
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/home/test/.local/bin/colab\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'Google Colab CLI\n',
        stderr: ''
      })

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(runner.isAvailable()).resolves.toBe(true)

    expect(wslService.execute).toHaveBeenNthCalledWith(1, 'Ubuntu-26.04', 'bash', [
      '-lc',
      'command -v colab'
    ])

    expect(wslService.execute).toHaveBeenNthCalledWith(
      2,
      'Ubuntu-26.04',
      '/home/test/.local/bin/colab',
      ['version']
    )
  })

  it('executes arguments using the resolved Colab executable', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute)
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/home/test/.local/bin/colab\n',
        stderr: ''
      })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: 'done',
        stderr: ''
      })

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await expect(runner.execute(['example', '--flag'])).resolves.toEqual({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    expect(wslService.execute).toHaveBeenNthCalledWith(
      2,
      'Ubuntu-26.04',
      '/home/test/.local/bin/colab',
      ['example', '--flag']
    )
  })

  it('reuses the resolved executable path', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.execute)
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: '/home/test/.local/bin/colab\n',
        stderr: ''
      })
      .mockResolvedValue({
        exitCode: 0,
        stdout: 'done',
        stderr: ''
      })

    const runner = new WslColabRunner({
      distribution: 'Ubuntu-26.04',
      wslService
    })

    await runner.execute(['version'])

    await runner.execute(['version'])

    expect(wslService.execute).toHaveBeenCalledTimes(3)

    expect(wslService.execute).toHaveBeenNthCalledWith(1, 'Ubuntu-26.04', 'bash', [
      '-lc',
      'command -v colab'
    ])
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
  })
})
