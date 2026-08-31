import { posix } from 'node:path'

export interface ColabConnectionPaths {
  directory: string
  sessionConfigPath: string
}

export function createColabConnectionPaths(
  homeDirectory: string,
  connectionId: string
): ColabConnectionPaths {
  const home = homeDirectory.trim()

  if (home.length === 0 || !home.startsWith('/')) {
    throw new Error('Colab home directory must be an absolute POSIX path.')
  }

  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(connectionId)) {
    throw new Error('Invalid Colab connection ID for path generation.')
  }

  const directory = posix.join(home, '.config', 'blendq', 'colab', connectionId)

  return {
    directory,
    sessionConfigPath: posix.join(directory, 'sessions.json')
  }
}
