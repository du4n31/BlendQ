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
})
