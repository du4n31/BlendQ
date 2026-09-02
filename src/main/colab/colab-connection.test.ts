import { describe, expect, it } from 'vitest'

import { createColabConnection, type ColabConnection } from './colab-connection'

describe('createColabConnection', () => {
  it('creates a native OAuth connection', () => {
    const connection: ColabConnection = createColabConnection({
      id: 'personal',
      displayName: 'Personal',
      authenticationStrategy: 'oauth2',
      runtime: {
        type: 'native'
      },
      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',
      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
    })

    expect(connection).toEqual({
      id: 'personal',
      displayName: 'Personal',
      authenticationStrategy: 'oauth2',
      runtime: {
        type: 'native'
      },
      sessionConfigPath: '/home/test/.config/blendq/colab/personal/sessions.json',
      authenticationHomeDirectory: '/home/test/.config/blendq/colab/personal/home'
    })
  })

  it('creates a WSL connection', () => {
    const connection = createColabConnection({
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

    expect(connection.runtime).toEqual({
      type: 'wsl',
      distribution: 'Ubuntu-26.04'
    })
  })

  it('supports ADC connections', () => {
    const connection = createColabConnection({
      id: 'work',
      displayName: 'Work',
      authenticationStrategy: 'adc',
      runtime: {
        type: 'native'
      },
      sessionConfigPath: '/home/test/.config/blendq/colab/work/sessions.json',
      authenticationHomeDirectory: '/home/test/.config/blendq/colab/work/home'
    })

    expect(connection.authenticationStrategy).toBe('adc')
  })

  it('rejects an empty connection ID', () => {
    expect(() =>
      createColabConnection({
        id: ' ',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'native'
        },
        sessionConfigPath: '/tmp/sessions.json',
        authenticationHomeDirectory: '/tmp/colab-home'
      })
    ).toThrow('Colab connection ID cannot be empty.')
  })

  it('rejects an empty display name', () => {
    expect(() =>
      createColabConnection({
        id: 'personal',
        displayName: '',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'native'
        },
        sessionConfigPath: '/tmp/sessions.json',
        authenticationHomeDirectory: '/tmp/colab-home'
      })
    ).toThrow('Colab connection display name cannot be empty.')
  })

  it('rejects an empty session config path', () => {
    expect(() =>
      createColabConnection({
        id: 'personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'native'
        },
        sessionConfigPath: '',
        authenticationHomeDirectory: '/tmp/colab-home'
      })
    ).toThrow('Colab session config path cannot be empty.')
  })

  it('rejects an empty authentication home directory', () => {
    expect(() =>
      createColabConnection({
        id: 'personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'native'
        },
        sessionConfigPath: '/tmp/sessions.json',
        authenticationHomeDirectory: ''
      })
    ).toThrow('Colab authentication home directory cannot be empty.')
  })

  it('rejects an empty WSL distribution', () => {
    expect(() =>
      createColabConnection({
        id: 'personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'wsl',
          distribution: ' '
        },
        sessionConfigPath: '/tmp/sessions.json',
        authenticationHomeDirectory: '/tmp/colab-home'
      })
    ).toThrow('WSL distribution name cannot be empty.')
  })

  it('rejects an unsafe connection ID', () => {
    expect(() =>
      createColabConnection({
        id: '../personal',
        displayName: 'Personal',
        authenticationStrategy: 'oauth2',
        runtime: {
          type: 'native'
        },
        sessionConfigPath: '/tmp/sessions.json',
        authenticationHomeDirectory: '/tmp/colab-home'
      })
    ).toThrow(
      'Colab connection ID must contain only lowercase letters, numbers, hyphens, and underscores.'
    )
  })
})
