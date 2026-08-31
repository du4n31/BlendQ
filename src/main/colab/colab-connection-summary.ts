import type { ColabConnectionSummary } from '../../shared/types'

import type { ColabConnection } from './colab-connection'

export function toColabConnectionSummary(connection: ColabConnection): ColabConnectionSummary {
  return {
    id: connection.id,
    displayName: connection.displayName,
    authenticationStrategy: connection.authenticationStrategy,
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
