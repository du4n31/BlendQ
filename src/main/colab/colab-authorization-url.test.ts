import { describe, expect, it } from 'vitest'

import { validateColabAuthorizationUrl } from './colab-authorization-url'

describe('validateColabAuthorizationUrl', () => {
  it('accepts the Google OAuth authorization URL', () => {
    expect(
      validateColabAuthorizationUrl('https://accounts.google.com/o/oauth2/auth?response_type=code')
    ).toBe('https://accounts.google.com/o/oauth2/auth?response_type=code')
  })

  it('rejects HTTP URLs', () => {
    expect(() => validateColabAuthorizationUrl('http://accounts.google.com/o/oauth2/auth')).toThrow(
      'Colab authorization URL must use HTTPS.'
    )
  })

  it('rejects unexpected hosts', () => {
    expect(() => validateColabAuthorizationUrl('https://example.com/o/oauth2/auth')).toThrow(
      'Colab authorization URL has an unexpected host.'
    )
  })

  it('rejects deceptive Google hostnames', () => {
    expect(() =>
      validateColabAuthorizationUrl('https://accounts.google.com.example.com/o/oauth2/auth')
    ).toThrow('Colab authorization URL has an unexpected host.')
  })

  it('rejects unexpected Google paths', () => {
    expect(() => validateColabAuthorizationUrl('https://accounts.google.com/not-oauth')).toThrow(
      'Colab authorization URL has an unexpected path.'
    )
  })

  it('rejects malformed URLs', () => {
    expect(() => validateColabAuthorizationUrl('not-a-url')).toThrow(
      'Colab returned an invalid authorization URL.'
    )
  })
})
