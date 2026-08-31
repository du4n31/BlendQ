import { describe, expect, it } from 'vitest'

import { WslService } from './wsl-service'

describe('WslService', () => {
  it('reports WSL as unavailable on non-Windows platforms', async () => {
    const service = new WslService({
      platform: 'linux'
    })

    await expect(service.isAvailable()).resolves.toBe(false)
  })

  it('rejects distribution listing on non-Windows platforms', async () => {
    const service = new WslService({
      platform: 'darwin'
    })

    await expect(service.listDistributions()).rejects.toThrow('WSL is only available on Windows.')
  })

  it('rejects command execution on non-Windows platforms', async () => {
    const service = new WslService({
      platform: 'linux'
    })

    await expect(service.execute('Ubuntu', 'echo', ['hello'])).rejects.toThrow(
      'WSL is only available on Windows.'
    )
  })

  it('reports a missing WSL executable as unavailable', async () => {
    const service = new WslService({
      platform: 'win32',
      executablePath: '__blendq_missing_wsl_executable__'
    })

    await expect(service.isAvailable()).resolves.toBe(false)
  })

  it('rejects an empty distribution name', async () => {
    const service = new WslService({
      platform: 'win32'
    })

    await expect(service.execute('', 'echo', [])).rejects.toThrow(
      'WSL distribution name cannot be empty.'
    )
  })

  it('rejects an empty command', async () => {
    const service = new WslService({
      platform: 'win32'
    })

    await expect(service.execute('Ubuntu', '', [])).rejects.toThrow('WSL command cannot be empty.')
  })

  it('does not treat WSL status lines as distribution names', async () => {
    const output = [
      'Default Distribution: Ubuntu-26.04',
      'Default Version: 2',
      'Ubuntu-26.04'
    ].filter(
      (value) => !value.startsWith('Default Distribution:') && !value.startsWith('Default Version:')
    )

    expect(output).toEqual(['Ubuntu-26.04'])
  })

  it('rejects home directory detection on non-Windows platforms', async () => {
    const service = new WslService({
      platform: 'linux'
    })

    await expect(service.getHomeDirectory('Ubuntu-26.04')).rejects.toThrow(
      'WSL is only available on Windows.'
    )
  })

  it('rejects an empty distribution when detecting the home directory', async () => {
    const service = new WslService({
      platform: 'win32'
    })

    await expect(service.getHomeDirectory('')).rejects.toThrow(
      'WSL distribution name cannot be empty.'
    )
  })
})
