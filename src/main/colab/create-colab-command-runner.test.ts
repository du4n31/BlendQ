import { describe, expect, it, vi } from 'vitest'

import type { WslService } from '../wsl/wsl-service'
import { NativeColabRunner } from './native-colab-runner'
import { WslColabRunner } from './wsl-colab-runner'
import { createColabCommandRunner } from './create-colab-command-runner'

function createMockWslService(): WslService {
  return {
    isAvailable: vi.fn(),
    listDistributions: vi.fn(),
    execute: vi.fn()
  } as unknown as WslService
}

describe('createColabCommandRunner', () => {
  it('creates a native runner on Linux', async () => {
    const runner = await createColabCommandRunner({
      platform: 'linux'
    })

    expect(runner).toBeInstanceOf(NativeColabRunner)
  })

  it('creates a native runner on macOS', async () => {
    const runner = await createColabCommandRunner({
      platform: 'darwin'
    })

    expect(runner).toBeInstanceOf(NativeColabRunner)
  })

  it('requires WSL on Windows', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.isAvailable).mockResolvedValue(false)

    await expect(
      createColabCommandRunner({
        platform: 'win32',
        wslService
      })
    ).rejects.toThrow('WSL is required to use Colab CLI on Windows.')
  })

  it('rejects Windows when no WSL distributions are available', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.isAvailable).mockResolvedValue(true)

    vi.mocked(wslService.listDistributions).mockResolvedValue([])

    await expect(
      createColabCommandRunner({
        platform: 'win32',
        wslService
      })
    ).rejects.toThrow('No WSL distributions are available.')
  })

  it('uses the default WSL distribution on Windows', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.isAvailable).mockResolvedValue(true)

    vi.mocked(wslService.listDistributions).mockResolvedValue([
      {
        name: 'Ubuntu-24.04',
        isDefault: false
      },
      {
        name: 'Ubuntu-26.04',
        isDefault: true
      }
    ])

    const runner = await createColabCommandRunner({
      platform: 'win32',
      wslService
    })

    expect(runner).toBeInstanceOf(WslColabRunner)
  })

  it('uses the preferred WSL distribution when available', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.isAvailable).mockResolvedValue(true)

    vi.mocked(wslService.listDistributions).mockResolvedValue([
      {
        name: 'Ubuntu-24.04',
        isDefault: false
      },
      {
        name: 'Ubuntu-26.04',
        isDefault: true
      }
    ])

    const runner = await createColabCommandRunner({
      platform: 'win32',
      wslService,
      preferredWslDistribution: 'Ubuntu-24.04'
    })

    expect(runner).toBeInstanceOf(WslColabRunner)
  })
})
