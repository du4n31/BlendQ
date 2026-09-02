import { describe, expect, it } from 'vitest'

import { createColabConnectionPaths } from './colab-connection-paths'

describe('createColabConnectionPaths', () => {
  it('creates isolated paths for a connection', () => {
    expect(createColabConnectionPaths('/home/test', 'personal')).toEqual({
      directory: '/home/test/.config/blendq/colab/personal',
      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',
      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
    })
  })

  it('isolates authentication homes between connections', () => {
    const personal = createColabConnectionPaths('/home/test', 'personal')
    const work = createColabConnectionPaths('/home/test', 'work')

    expect(personal.authenticationHomeDirectory).not.toBe(work.authenticationHomeDirectory)
  })

  it('supports macOS home directories', () => {
    expect(createColabConnectionPaths('/Users/test', 'work')).toEqual({
      directory: '/Users/test/.config/blendq/colab/work',
      sessionConfigPath: '/Users/test/.config/blendq/colab/work/sessions.json',
      authenticationHomeDirectory: '/Users/test/.config/blendq/colab/work/home'
    })
  })

  it('normalizes trailing separators', () => {
    expect(createColabConnectionPaths('/home/test/', 'personal').directory).toBe(
      '/home/test/.config/blendq/colab/personal'
    )
  })

  it('rejects a relative home directory', () => {
    expect(() => createColabConnectionPaths('home/test', 'personal')).toThrow(
      'Colab home directory must be an absolute POSIX path.'
    )
  })

  it('rejects an empty home directory', () => {
    expect(() => createColabConnectionPaths('', 'personal')).toThrow(
      'Colab home directory must be an absolute POSIX path.'
    )
  })

  it('rejects an unsafe connection ID', () => {
    expect(() => createColabConnectionPaths('/home/test', '../work')).toThrow(
      'Invalid Colab connection ID for path generation.'
    )
  })
})
