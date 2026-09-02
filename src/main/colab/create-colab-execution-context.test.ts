import { describe, expect, it } from 'vitest'

import { createColabExecutionContext } from './create-colab-execution-context'

describe('createColabExecutionContext', () => {
  it('creates an isolated execution context', () => {
    expect(
      createColabExecutionContext({
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
    ).toEqual({
      authenticationStrategy: 'oauth2',

      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home',

      runtime: {
        type: 'wsl',
        distribution: 'Ubuntu-26.04'
      }
    })
  })

  it('does not expose connection presentation metadata', () => {
    const context = createColabExecutionContext({
      id: 'personal',
      displayName: 'Personal',
      authenticationStrategy: 'oauth2',

      runtime: {
        type: 'native'
      },

      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',

      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
    })

    expect('id' in context).toBe(false)

    expect('displayName' in context).toBe(false)
  })
})
