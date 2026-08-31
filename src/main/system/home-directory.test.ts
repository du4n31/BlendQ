import { describe, expect, it, vi } from 'vitest'

vi.mock('node:os', () => ({
  homedir: vi.fn()
}))

import { homedir } from 'node:os'
import { getNativeHomeDirectory } from './home-directory'

const mockedHomeDirectory = vi.mocked(homedir)

describe('getNativeHomeDirectory', () => {
  it('returns a valid POSIX home directory', () => {
    mockedHomeDirectory.mockReturnValue('/home/test')

    expect(getNativeHomeDirectory()).toBe('/home/test')
  })

  it('rejects an empty home directory', () => {
    mockedHomeDirectory.mockReturnValue('')

    expect(() => getNativeHomeDirectory()).toThrow(
      'Failed to detect a valid native home directory.'
    )
  })

  it('rejects a non-POSIX home directory', () => {
    mockedHomeDirectory.mockReturnValue('C:\\Users\\Test')

    expect(() => getNativeHomeDirectory()).toThrow(
      'Failed to detect a valid native home directory.'
    )
  })
})
