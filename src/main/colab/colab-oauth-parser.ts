export interface ColabOAuthParserState {
  authorizationUrl: string | null
  authorizationPromptDetected: boolean
}

const AUTHORIZATION_PROMPT = 'Enter the authorization code:'

const AUTHORIZATION_URL_PATTERN = /https:\/\/accounts\.google\.com\/[^\s]+(?=\s)/

export class ColabOAuthParser {
  #buffer = ''

  #authorizationUrl: string | null = null

  #authorizationPromptDetected = false

  push(chunk: string): ColabOAuthParserState {
    this.#buffer += chunk

    if (!this.#authorizationUrl) {
      const match = this.#buffer.match(AUTHORIZATION_URL_PATTERN)

      if (match) {
        this.#authorizationUrl = match[0]
      }
    }

    if (!this.#authorizationPromptDetected && this.#buffer.includes(AUTHORIZATION_PROMPT)) {
      this.#authorizationPromptDetected = true
    }

    return this.getState()
  }

  getState(): ColabOAuthParserState {
    return {
      authorizationUrl: this.#authorizationUrl,

      authorizationPromptDetected: this.#authorizationPromptDetected
    }
  }
}
