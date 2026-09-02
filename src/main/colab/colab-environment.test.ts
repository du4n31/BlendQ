import { describe, expect, it, vi } from 'vitest'

import type { ColabCommandRunner } from './colab-command-runner'

import { detectColabEnvironment } from './colab-environment'

function createMockRunner(): ColabCommandRunner {
  return {
    isAvailable: vi.fn(),
    execute: vi.fn(),
    start: vi.fn()
  }
}

describe('detectColabEnvironment', () => {
  it('reports an unavailable runner', async () => {
    const result = await detectColabEnvironment(async () => {
      throw new Error('WSL is required to use Colab CLI on Windows.')
    })

    expect(result).toEqual({
      state: 'runner-unavailable',
      message: 'WSL is required to use Colab CLI on Windows.'
    })
  })

  it('reports a missing CLI', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.isAvailable).mockResolvedValue(false)

    const result = await detectColabEnvironment(async () => runner)

    expect(result).toEqual({
      state: 'cli-missing',
      message: 'Google Colab CLI is not available.'
    })
  })

  it('reports the installed CLI version', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.isAvailable).mockResolvedValue(true)

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 0,
      stdout: 'Google Colab CLI 0.1.0\n',
      stderr: ''
    })

    const result = await detectColabEnvironment(async () => runner)

    expect(result).toEqual({
      state: 'available',
      version: 'Google Colab CLI 0.1.0'
    })

    expect(runner.execute).toHaveBeenCalledWith(['version'])
  })

  it('reports a version command failure', async () => {
    const runner = createMockRunner()

    vi.mocked(runner.isAvailable).mockResolvedValue(true)

    vi.mocked(runner.execute).mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Failed to read version.'
    })

    const result = await detectColabEnvironment(async () => runner)

    expect(result).toEqual({
      state: 'error',
      message: 'Failed to read version.'
    })
  })
})
