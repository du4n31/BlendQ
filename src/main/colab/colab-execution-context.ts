import type { ColabAuthenticationStrategy } from '../../shared/types'

import type { ColabConnectionRuntime } from './colab-connection'

export interface ColabExecutionContext {
  authenticationStrategy: ColabAuthenticationStrategy

  sessionConfigPath: string

  authenticationHomeDirectory: string

  runtime: ColabConnectionRuntime
}
