import type { ColabInteractiveCommand } from './colab-command-runner'

import type { ColabClient } from './colab-client'

import { ColabOAuthParser } from './colab-oauth-parser'

export interface ColabAuthenticationFlowCallbacks {
  onAuthorizationUrl?: (url: string) => void

  onAuthorizationCodeRequested?: () => void
}

export interface ColabAuthenticationResult {
  exitCode: number
  stdout: string
  stderr: string
}

export class ColabAuthenticationFlow {
  readonly #client: ColabClient

  #command: ColabInteractiveCommand | null = null

  #authorizationCodeRequested = false

  constructor(client: ColabClient) {
    this.#client = client
  }

  async start(callbacks: ColabAuthenticationFlowCallbacks = {}): Promise<void> {
    if (this.#command) {
      throw new Error('Colab authentication is already in progress.')
    }

    const parser = new ColabOAuthParser()

    let authorizationUrlReported = false

    const handleChunk = (chunk: string): void => {
      const state = parser.push(chunk)

      if (state.authorizationUrl && !authorizationUrlReported) {
        authorizationUrlReported = true

        callbacks.onAuthorizationUrl?.(state.authorizationUrl)
      }

      if (state.authorizationPromptDetected && !this.#authorizationCodeRequested) {
        this.#authorizationCodeRequested = true

        callbacks.onAuthorizationCodeRequested?.()
      }
    }

    this.#command = await this.#client.start(['sessions'], {
      onStdout: handleChunk,

      onStderr: handleChunk
    })
  }

  submitAuthorizationCode(code: string): void {
    if (!this.#command) {
      throw new Error('No Colab authentication is in progress.')
    }

    if (!this.#authorizationCodeRequested) {
      throw new Error('Colab is not waiting for an authorization code.')
    }

    const normalizedCode = code.trim()

    if (normalizedCode.length === 0) {
      throw new Error('Authorization code cannot be empty.')
    }

    this.#command.writeStdin(`${normalizedCode}\n`)

    this.#command.closeStdin()
  }

  async waitForResult(): Promise<ColabAuthenticationResult> {
    if (!this.#command) {
      throw new Error('No Colab authentication is in progress.')
    }

    const result = await this.#command.result

    this.#command = null
    this.#authorizationCodeRequested = false

    return result
  }

  cancel(): void {
    if (!this.#command) {
      return
    }

    this.#command.kill()

    this.#command = null
    this.#authorizationCodeRequested = false
  }
}
