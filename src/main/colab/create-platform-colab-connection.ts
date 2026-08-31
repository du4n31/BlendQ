import type { AddColabConnectionRequest } from '../../shared/types'

import { createManagedColabConnection } from './create-colab-connection'

import type { ColabConnection } from './colab-connection'

import { WslService } from '../wsl/wsl-service'

import { getNativeHomeDirectory } from '../system/home-directory'

export interface CreatePlatformColabConnectionOptions {
  request: AddColabConnectionRequest

  platform?: NodeJS.Platform

  wslService?: WslService
}

export async function createPlatformColabConnection(
  options: CreatePlatformColabConnectionOptions
): Promise<ColabConnection> {
  const platform = options.platform ?? process.platform

  if (platform === 'linux' || platform === 'darwin') {
    return createManagedColabConnection({
      id: options.request.id,
      displayName: options.request.displayName,
      authenticationStrategy: options.request.authenticationStrategy,
      runtime: {
        type: 'native'
      },
      nativeHomeDirectory: getNativeHomeDirectory()
    })
  }

  if (platform === 'win32') {
    const wslService =
      options.wslService ??
      new WslService({
        platform
      })

    if (!(await wslService.isAvailable())) {
      throw new Error('WSL is required to create a Colab connection on Windows.')
    }

    const distributions = await wslService.listDistributions()

    const distribution =
      distributions.find((candidate) => candidate.isDefault) ?? distributions[0] ?? null

    if (!distribution) {
      throw new Error('No WSL distributions are available.')
    }

    return createManagedColabConnection({
      id: options.request.id,
      displayName: options.request.displayName,
      authenticationStrategy: options.request.authenticationStrategy,
      runtime: {
        type: 'wsl',
        distribution: distribution.name
      },
      wslService
    })
  }

  throw new Error(`Colab connections are not supported on platform "${platform}".`)
}
