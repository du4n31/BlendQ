import { describe, expect, it } from 'vitest'

import { toColabConnectionSummary } from './colab-connection-summary'

describe('toColabConnectionSummary', () => {
  it('does not expose internal connection paths', () => {
    const summary = toColabConnectionSummary({
      id: 'personal',
      displayName: 'Personal',
      authenticationStrategy: 'oauth2',
      runtime: {
        type: 'wsl',
        distribution: 'Ubuntu-26.04'
      },
      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',
      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
    })

    expect(summary).toEqual({
      id: 'personal',
      displayName: 'Personal',
      authenticationStrategy: 'oauth2',
      runtime: {
        type: 'wsl',
        distribution: 'Ubuntu-26.04'
      }
    })

    expect('sessionConfigPath' in summary).toBe(false)
    expect('authenticationHomeDirectory' in summary).toBe(false)
  })
})
