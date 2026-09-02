import type { ColabConnection } from './colab-connection'

import type { ColabExecutionContext } from './colab-execution-context'

export function createColabExecutionContext(connection: ColabConnection): ColabExecutionContext {
  return {
    authenticationStrategy: connection.authenticationStrategy,

    sessionConfigPath: connection.sessionConfigPath,

    authenticationHomeDirectory: connection.authenticationHomeDirectory,

    runtime:
      connection.runtime.type === 'wsl'
        ? {
            type: 'wsl',
            distribution: connection.runtime.distribution
          }
        : {
            type: 'native'
          }
  }
}
