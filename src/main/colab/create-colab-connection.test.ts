import { describe, expect, it, vi } from 'vitest'

import type { WslService } from '../wsl/wsl-service'
import { createManagedColabConnection } from './create-colab-connection'

function createMockWslService(): WslService {
  return {
    isAvailable: vi.fn(),
    listDistributions: vi.fn(),
    execute: vi.fn(),
    getHomeDirectory: vi.fn()
  } as unknown as WslService
}

describe('createManagedColabConnection', () => {
  it('creates a native connection with generated paths', async () => {
    await expect(
      createManagedColabConnection({
        id: 'personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'native'
        },
        nativeHomeDirectory: '/home/test'
      })
    ).resolves.toEqual({
      id: 'personal',
      displayName: 'Personal',
      authenticationStrategy: 'oauth2',
      runtime: {
        type: 'native'
      },
      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',
      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
    })
  })

  it('creates a WSL connection using the detected Linux home directory', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.getHomeDirectory).mockResolvedValue('/home/test')

    await expect(
      createManagedColabConnection({
        id: 'personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'wsl',
          distribution: 'Ubuntu-26.04'
        },
        wslService
      })
    ).resolves.toEqual({
      id: 'personal',
      displayName: 'Personal',
      authenticationStrategy: 'oauth2',
      runtime: {
        type: 'wsl',
        distribution: 'Ubuntu-26.04'
      },
      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',
      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
    })

    expect(wslService.getHomeDirectory).toHaveBeenCalledWith('Ubuntu-26.04')
  })

  it('requires a home directory for native connections', async () => {
    await expect(
      createManagedColabConnection({
        id: 'personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'native'
        }
      })
    ).rejects.toThrow('Native Colab home directory is required.')
  })

  it('propagates WSL home directory detection failures', async () => {
    const wslService = createMockWslService()

    vi.mocked(wslService.getHomeDirectory).mockRejectedValue(
      new Error('Failed to detect the WSL home directory.')
    )

    await expect(
      createManagedColabConnection({
        id: 'personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'wsl',
          distribution: 'Ubuntu-26.04'
        },
        wslService
      })
    ).rejects.toThrow('Failed to detect the WSL home directory.')
  })
})
