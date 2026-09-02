import type { ColabConnection } from './colab-connection'

import { ColabClient } from './colab-client'

import { createColabExecutionContext } from './create-colab-execution-context'

import { NativeColabRunner } from './native-colab-runner'

import { WslColabRunner } from './wsl-colab-runner'

import type { ColabCommandRunner } from './colab-command-runner'

import type { WslService } from '../wsl/wsl-service'

export interface CreateColabClientOptions {
  connection: ColabConnection

  platform?: NodeJS.Platform

  wslService?: WslService

  nativeRunner?: ColabCommandRunner
}

export function createColabClient(options: CreateColabClientOptions): ColabClient {
  const platform = options.platform ?? process.platform

  const context = createColabExecutionContext(options.connection)

  let runner: ColabCommandRunner

  if (options.connection.runtime.type === 'wsl') {
    if (platform !== 'win32') {
      throw new Error('WSL Colab connections can only run on Windows.')
    }

    runner = new WslColabRunner({
      distribution: options.connection.runtime.distribution,

      wslService: options.wslService
    })
  } else {
    if (platform !== 'linux' && platform !== 'darwin') {
      throw new Error(`Native Colab connections are not supported on platform "${platform}".`)
    }

    runner =
      options.nativeRunner ??
      new NativeColabRunner({
        platform
      })
  }

  return new ColabClient({
    runner,
    context
  })
}
