import { describe, expect, it, vi } from 'vitest'

import type { ColabCommandRunner } from './colab-command-runner'

import { ColabClient } from './colab-client'

function createMockRunner(): ColabCommandRunner {
  return {
    isAvailable: vi.fn(),
    execute: vi.fn(),
    start: vi.fn()
  }
}

describe('ColabClient', () => {
  it('executes an OAuth command with isolated connection settings', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

    const client = new ColabClient({
      runner,

      context: {
        authenticationStrategy: 'oauth2',

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home',

        runtime: {
          type: 'wsl',
          distribution: 'Ubuntu-26.04'
        }
      }
    })

    await expect(client.execute(['sessions'])).resolves.toEqual({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })

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

  it('supports ADC authentication', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: ''
    })

    const client = new ColabClient({
      runner,

      context: {
        authenticationStrategy: 'adc',

        sessionConfigPath: '/home/test/.config/blendq/colab/work/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/work/home',

        runtime: {
          type: 'native'
        }
      }
    })

    await client.execute(['sessions'])

    expect(runner.execute).toHaveBeenCalledWith(
      [
        '--auth',
        'adc',

        '--config',
        '/home/test/.config/blendq/colab/work/sessions.json',

        'sessions'
      ],
      {
        environment: {
          HOME: '/home/test/.config/blendq/colab/work/home'
        }
      }
    )
  })

  it('passes command arguments without shell construction', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: ''
    })

    const client = new ColabClient({
      runner,

      context: {
        authenticationStrategy: 'oauth2',

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home',

        runtime: {
          type: 'native'
        }
      }
    })

    await client.execute(['status', '--session', 'test-session'])

    expect(runner.execute).toHaveBeenCalledWith(
      [
        '--auth',
        'oauth2',

        '--config',
        '/home/test/.config/blendq/colab/personal/sessions.json',

        'status',
        '--session',
        'test-session'
      ],
      {
        environment: {
          HOME: '/home/test/.config/blendq/colab/personal/home'
        }
      }
    )
  })

  it('rejects an empty command', async () => {
    const runner = createMockRunner()

    const client = new ColabClient({
      runner,

      context: {
        authenticationStrategy: 'oauth2',

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home',

        runtime: {
          type: 'native'
        }
      }
    })

    await expect(client.execute([])).rejects.toThrow('Colab command arguments cannot be empty.')

    expect(runner.execute).not.toHaveBeenCalled()
  })

  it('propagates command results unchanged', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 7,
      stdout: 'partial output',
      stderr: 'command failed'
    })

    const client = new ColabClient({
      runner,

      context: {
        authenticationStrategy: 'oauth2',

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home',

        runtime: {
          type: 'native'
        }
      }
    })

    await expect(client.execute(['sessions'])).resolves.toEqual({
      exitCode: 7,
      stdout: 'partial output',
      stderr: 'command failed'
    })
  })

  it('starts an interactive command with isolated connection settings', async () => {
    const runner = createMockRunner()

    const interactiveCommand = {
      writeStdin: vi.fn(),
      closeStdin: vi.fn(),
      kill: vi.fn(),
      result: Promise.resolve({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
    }

    vi.mocked(runner.start).mockResolvedValue(interactiveCommand)

    const onStdout = vi.fn()

    const onStderr = vi.fn()

    const client = new ColabClient({
      runner,

      context: {
        authenticationStrategy: 'oauth2',

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home',

        runtime: {
          type: 'wsl',
          distribution: 'Ubuntu-26.04'
        }
      }
    })

    await expect(
      client.start(['sessions'], {
        onStdout,
        onStderr
      })
    ).resolves.toBe(interactiveCommand)

    expect(runner.start).toHaveBeenCalledWith(
      [
        '--auth',
        'oauth2',

        '--config',
        '/home/test/.config/blendq/colab/personal/sessions.json',

        'sessions'
      ],
      {
        onStdout,
        onStderr,

        environment: {
          HOME: '/home/test/.config/blendq/colab/personal/home'
        }
      }
    )
  })

  it('does not allow callers to override the isolated HOME', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.start).mockResolvedValue({
      writeStdin: vi.fn(),
      closeStdin: vi.fn(),
      kill: vi.fn(),

      result: Promise.resolve({
        exitCode: 0,
        stdout: '',
        stderr: ''
      })
    })

    const client = new ColabClient({
      runner,

      context: {
        authenticationStrategy: 'oauth2',

        sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

        authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home',

        runtime: {
          type: 'native'
        }
      }
    })

    await client.start(['sessions'], {
      environment: {
        HOME: '/malicious/home',

        TEST: 'value'
      }
    })

    expect(runner.start).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        environment: {
          HOME: '/home/test/.config/blendq/colab/personal/home',

          TEST: 'value'
        }
      })
    )
  })
})
