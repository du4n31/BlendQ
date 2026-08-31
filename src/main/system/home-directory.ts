import { homedir } from 'node:os'

export function getNativeHomeDirectory(): string {
  const homeDirectory = homedir().trim()

  if (homeDirectory.length === 0 || !homeDirectory.startsWith('/')) {
    throw new Error('Failed to detect a valid native home directory.')
  }

  return homeDirectory
}
