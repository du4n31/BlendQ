import { describe, expect, it, vi } from 'vitest'

import type { ColabCommandRunner } from './colab-command-runner'

import type { WslInteractiveCommand, WslService } from '../wsl/wsl-service'

import { createColabClient } from './create-colab-client'

function createMockRunner(): ColabCommandRunner {
  return {
    isAvailable: vi.fn(),

    execute: vi.fn(),

    start: vi.fn()
  }
}

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

describe('createColabClient', () => {
  it('creates a native client on Linux', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    const client = createColabClient({
      platform: 'linux',

      nativeRunner: runner,

      connection: {
        id: 'personal',

        displayName: 'Personal',

        authenticationStrategy: 'oauth2',

        runtime: {
          type: 'native'
        },

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
      }
    })

    await client.execute(['sessions'])

    expect(runner.execute).toHaveBeenCalledWith(
      [
        '--auth',
        'oauth2',

        '--config',
        '/home/test/.config/blendq/colab/personal/sessions.json',

        'sessions'
      ],
      {
        environment: {
          HOME: '/home/test/.config/blendq/colab/personal/home'
        }
      }
    )
  })

  it('creates a native client on macOS', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: ''
    })

    const client = createColabClient({
      platform: 'darwin',

      nativeRunner: runner,

      connection: {
        id: 'personal',

        displayName: 'Personal',

        authenticationStrategy: 'oauth2',

        runtime: {
          type: 'native'
        },

        sessionConfigPath: '/Users/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/Users/test/.config/blendq/colab/personal/home'
      }
    })

    await expect(client.execute(['sessions'])).resolves.toEqual({
      exitCode: 0,
      stdout: '',
      stderr: ''
    })
  })

  it('creates a WSL client using the connection distribution', async () => {
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

    const client = createColabClient({
      platform: 'win32',

      wslService,

      connection: {
        id: 'personal',

        displayName: 'Personal',

        authenticationStrategy: 'oauth2',

        runtime: {
          type: 'wsl',
          distribution: 'Ubuntu-26.04'
        },

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
      }
    })

    await expect(client.execute(['sessions'])).resolves.toEqual({
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

        '--auth',
        'oauth2',

        '--config',
        '/home/test/.config/blendq/colab/personal/sessions.json',

        'sessions'
      ],
      {
        onStdout: undefined,
        onStderr: undefined
      }
    )

    expect(command.closeStdin).toHaveBeenCalled()
  })

  it('rejects a WSL connection outside Windows', () => {
    expect(() =>
      createColabClient({
        platform: 'linux',

        connection: {
          id: 'personal',

          displayName: 'Personal',

          authenticationStrategy: 'oauth2',

          runtime: {
            type: 'wsl',
            distribution: 'Ubuntu-26.04'
          },

          sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

          authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
        }
      })
    ).toThrow('WSL Colab connections can only run on Windows.')
  })

  it('rejects a native connection on Windows', () => {
    expect(() =>
      createColabClient({
        platform: 'win32',

        connection: {
          id: 'personal',

          displayName: 'Personal',

          authenticationStrategy: 'oauth2',

          runtime: {
            type: 'native'
          },

          sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

          authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
        }
      })
    ).toThrow('Native Colab connections are not supported on platform "win32".')
  })
})
