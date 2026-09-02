import { describe, expect, it } from 'vitest'

import { ColabOAuthParser } from './colab-oauth-parser'

describe('ColabOAuthParser', () => {
  it('extracts a complete Google authorization URL', () => {
    const parser = new ColabOAuthParser()

    const state = parser.push(
      [
        'To authorize colab-cli, visit this URL in any browser:\n',
        '\n',
        '  https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=test\n'
      ].join('')
    )

    expect(state.authorizationUrl).toBe(
      'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=test'
    )
  })

  it('does not report an authorization URL before its terminator arrives', () => {
    const parser = new ColabOAuthParser()

    const state = parser.push(
      'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=test'
    )

    expect(state.authorizationUrl).toBeNull()
  })

  it('waits for the complete query string across chunks', () => {
    const parser = new ColabOAuthParser()

    const firstState = parser.push(
      'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=test'
    )

    expect(firstState.authorizationUrl).toBeNull()

    const secondState = parser.push(
      '&redirect_uri=https%3A%2F%2Fsdk.cloud.google.com%2Fapplicationdefaultauthcode.html'
    )

    expect(secondState.authorizationUrl).toBeNull()

    const thirdState = parser.push('&state=example-state&code_challenge=example-challenge\n')

    expect(thirdState.authorizationUrl).toBe(
      [
        'https://accounts.google.com/o/oauth2/auth?',
        'response_type=code',
        '&client_id=test',
        '&redirect_uri=https%3A%2F%2Fsdk.cloud.google.com%2Fapplicationdefaultauthcode.html',
        '&state=example-state',
        '&code_challenge=example-challenge'
      ].join('')
    )
  })

  it('handles the hostname split across chunks', () => {
    const parser = new ColabOAuthParser()

    parser.push('https://accounts.google.')

    const state = parser.push('com/o/oauth2/auth?response_type=code&client_id=test\n')

    expect(state.authorizationUrl).toBe(
      'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=test'
    )
  })

  it('detects the authorization code prompt', () => {
    const parser = new ColabOAuthParser()

    const state = parser.push('Enter the authorization code: ')

    expect(state.authorizationPromptDetected).toBe(true)
  })

  it('handles the authorization prompt split across chunks', () => {
    const parser = new ColabOAuthParser()

    parser.push('Enter the authoriza')

    const state = parser.push('tion code: ')

    expect(state.authorizationPromptDetected).toBe(true)
  })

  it('ignores unrelated URLs', () => {
    const parser = new ColabOAuthParser()

    const state = parser.push('See https://example.com/help for more information.\n')

    expect(state.authorizationUrl).toBeNull()
  })

  it('preserves detected state across subsequent chunks', () => {
    const parser = new ColabOAuthParser()

    parser.push('https://accounts.google.com/o/oauth2/auth?response_type=code\n')

    parser.push('Enter the authorization code: ')

    const state = parser.push('additional output')

    expect(state).toEqual({
      authorizationUrl: 'https://accounts.google.com/o/oauth2/auth?response_type=code',

      authorizationPromptDetected: true
    })
  })
})
