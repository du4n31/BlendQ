import type { ColabAuthenticationStrategy } from '../../shared/types'

export type ColabConnectionRuntime =
  | {
      type: 'native'
    }
  | {
      type: 'wsl'
      distribution: string
    }

export interface ColabConnection {
  id: string
  displayName: string
  authenticationStrategy: ColabAuthenticationStrategy
  runtime: ColabConnectionRuntime
  sessionConfigPath: string
}

export interface CreateColabConnectionOptions {
  id: string
  displayName: string
  authenticationStrategy: ColabAuthenticationStrategy
  runtime: ColabConnectionRuntime
  sessionConfigPath: string
}

export function createColabConnection(options: CreateColabConnectionOptions): ColabConnection {
  const id = options.id.trim()

  if (id.length === 0) {
    throw new Error('Colab connection ID cannot be empty.')
  }

  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(id)) {
    throw new Error(
      'Colab connection ID must contain only lowercase letters, numbers, hyphens, and underscores.'
    )
  }

  const displayName = options.displayName.trim()

  if (displayName.length === 0) {
    throw new Error('Colab connection display name cannot be empty.')
  }

  const sessionConfigPath = options.sessionConfigPath.trim()

  if (sessionConfigPath.length === 0) {
    throw new Error('Colab session config path cannot be empty.')
  }

  if (options.runtime.type === 'wsl' && options.runtime.distribution.trim().length === 0) {
    throw new Error('WSL distribution name cannot be empty.')
  }

  return {
    id,
    displayName,
    authenticationStrategy: options.authenticationStrategy,
    runtime:
      options.runtime.type === 'wsl'
        ? {
            type: 'wsl',
            distribution: options.runtime.distribution.trim()
          }
        : {
            type: 'native'
          },
    sessionConfigPath
  }
}
