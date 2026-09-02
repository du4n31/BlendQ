import { describe, expect, it } from 'vitest'

import { NativeColabRunner } from './native-colab-runner'

describe('NativeColabRunner', () => {
  it('reports native execution as unavailable on Windows', async () => {
    const runner = new NativeColabRunner({
      platform: 'win32'
    })

    await expect(runner.isAvailable()).resolves.toBe(false)
  })

  it('rejects native execution on Windows', async () => {
    const runner = new NativeColabRunner({
      platform: 'win32'
    })

    await expect(runner.execute(['version'])).rejects.toThrow(
      'Native Colab CLI execution is not supported on platform "win32".'
    )
  })

  it('reports a missing native executable as unavailable', async () => {
    const runner = new NativeColabRunner({
      platform: 'linux',

      executablePath: '__blendq_missing_colab_executable__'
    })

    await expect(runner.isAvailable()).resolves.toBe(false)
  })

  it('passes controlled environment variables to the process', async () => {
    const runner = new NativeColabRunner({
      platform: 'linux',
      executablePath: process.execPath
    })

    const result = await runner.execute(
      ['-e', 'process.stdout.write(process.env.BLENDQ_TEST_VALUE ?? "")'],
      {
        environment: {
          BLENDQ_TEST_VALUE: 'isolated'
        }
      }
    )

    expect(result.exitCode).toBe(0)

    expect(result.stdout).toBe('isolated')

    expect(result.stderr).toBe('')
  })

  it('preserves the parent environment when adding controlled variables', async () => {
    const runner = new NativeColabRunner({
      platform: 'linux',
      executablePath: process.execPath
    })

    const result = await runner.execute(
      ['-e', 'process.stdout.write(process.env.PATH ? "available" : "missing")'],
      {
        environment: {
          BLENDQ_TEST_VALUE: 'isolated'
        }
      }
    )

    expect(result.exitCode).toBe(0)

    expect(result.stdout).toBe('available')
  })
})
