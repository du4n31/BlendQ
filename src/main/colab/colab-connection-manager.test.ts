import { describe, expect, it } from 'vitest'

import type { ColabConnection } from './colab-connection'
import { ColabConnectionManager } from './colab-connection-manager'

function createConnection(id: string): ColabConnection {
  return {
    id,
    displayName: id,
    authenticationStrategy: 'oauth2',
    runtime: {
      type: 'native'
    },
    sessionConfigPath: `/home/test/.config/blendq/colab/${id}/sessions.json`
  }
}

describe('ColabConnectionManager', () => {
  it('adds and retrieves a connection', () => {
    const manager = new ColabConnectionManager()

    const connection = createConnection('personal')

    manager.add(connection)

    expect(manager.get('personal')).toEqual(connection)
  })

  it('lists all connections in insertion order', () => {
    const manager = new ColabConnectionManager()

    const personal = createConnection('personal')

    const work = createConnection('work')

    manager.add(personal)
    manager.add(work)

    expect(manager.list()).toEqual([personal, work])
  })

  it('rejects duplicate connection IDs', () => {
    const manager = new ColabConnectionManager()

    manager.add(createConnection('personal'))

    expect(() => manager.add(createConnection('personal'))).toThrow(
      'A Colab connection with ID "personal" already exists.'
    )
  })

  it('returns null for an unknown connection', () => {
    const manager = new ColabConnectionManager()

    expect(manager.get('missing')).toBeNull()
  })

  it('removes an existing connection', () => {
    const manager = new ColabConnectionManager()

    manager.add(createConnection('personal'))

    expect(manager.remove('personal')).toBe(true)

    expect(manager.get('personal')).toBeNull()
  })

  it('returns false when removing an unknown connection', () => {
    const manager = new ColabConnectionManager()

    expect(manager.remove('missing')).toBe(false)
  })

  it('clears all connections', () => {
    const manager = new ColabConnectionManager()

    manager.add(createConnection('personal'))

    manager.add(createConnection('work'))

    manager.clear()

    expect(manager.list()).toEqual([])
  })
})
