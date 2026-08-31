import {
  createColabConnection,
  type ColabConnection,
  type ColabConnectionRuntime
} from './colab-connection'

import { createColabConnectionPaths } from './colab-connection-paths'

import { WslService } from '../wsl/wsl-service'

import type { ColabAuthenticationStrategy } from '../../shared/types'

export interface CreateManagedColabConnectionOptions {
  id: string
  displayName: string
  authenticationStrategy: ColabAuthenticationStrategy
  runtime: ColabConnectionRuntime
  nativeHomeDirectory?: string
  wslService?: WslService
}

export async function createManagedColabConnection(
  options: CreateManagedColabConnectionOptions
): Promise<ColabConnection> {
  let homeDirectory: string

  if (options.runtime.type === 'wsl') {
    const wslService = options.wslService ?? new WslService()

    homeDirectory = await wslService.getHomeDirectory(options.runtime.distribution)
  } else {
    if (!options.nativeHomeDirectory) {
      throw new Error('Native Colab home directory is required.')
    }

    homeDirectory = options.nativeHomeDirectory
  }

  const paths = createColabConnectionPaths(homeDirectory, options.id.trim())

  return createColabConnection({
    id: options.id,
    displayName: options.displayName,
    authenticationStrategy: options.authenticationStrategy,
    runtime: options.runtime,
    sessionConfigPath: paths.sessionConfigPath
  })
}
