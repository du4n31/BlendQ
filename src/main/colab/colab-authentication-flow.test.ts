import { describe, expect, it, vi } from 'vitest'

import type { ColabInteractiveCommand } from './colab-command-runner'

import type { ColabClient } from './colab-client'

import { ColabAuthenticationFlow } from './colab-authentication-flow'

function createInteractiveCommand(): ColabInteractiveCommand {
  return {
    writeStdin: vi.fn(),

    closeStdin: vi.fn(),

    kill: vi.fn(),

    result: Promise.resolve({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })
  }
}

describe('ColabAuthenticationFlow', () => {
  it('reports the authorization URL and code prompt from streamed output', async () => {
    const command = createInteractiveCommand()

    let onStdout: ((chunk: string) => void) | undefined

    const client = {
      start: vi.fn(async (_args, options) => {
        onStdout = options?.onStdout

        return command
      })
    } as unknown as ColabClient

    const onAuthorizationUrl = vi.fn()

    const onAuthorizationCodeRequested = vi.fn()

    const flow = new ColabAuthenticationFlow(client)

    await flow.start({
      onAuthorizationUrl,
      onAuthorizationCodeRequested
    })

    onStdout?.('To authorize colab-cli, visit this URL:\n')

    onStdout?.('https://accounts.google.com/o/oauth2/auth?response_type=code\n')

    onStdout?.('Enter the authorization code: ')

    expect(onAuthorizationUrl).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/auth?response_type=code'
    )

    expect(onAuthorizationCodeRequested).toHaveBeenCalledTimes(1)
  })

  it('submits the authorization code through stdin', async () => {
    const command = createInteractiveCommand()

    let onStdout: ((chunk: string) => void) | undefined

    const client = {
      start: vi.fn(async (_args, options) => {
        onStdout = options?.onStdout

        return command
      })
    } as unknown as ColabClient

    const flow = new ColabAuthenticationFlow(client)

    await flow.start()

    onStdout?.('Enter the authorization code: ')

    flow.submitAuthorizationCode(' test-code ')

    expect(command.writeStdin).toHaveBeenCalledWith('test-code\n')

    expect(command.closeStdin).toHaveBeenCalled()
  })

  it('rejects an authorization code before the prompt appears', async () => {
    const command = createInteractiveCommand()

    const client = {
      start: vi.fn().mockResolvedValue(command)
    } as unknown as ColabClient

    const flow = new ColabAuthenticationFlow(client)

    await flow.start()

    expect(() => flow.submitAuthorizationCode('code')).toThrow(
      'Colab is not waiting for an authorization code.'
    )
  })

  it('rejects an empty authorization code', async () => {
    const command = createInteractiveCommand()

    let onStdout: ((chunk: string) => void) | undefined

    const client = {
      start: vi.fn(async (_args, options) => {
        onStdout = options?.onStdout

        return command
      })
    } as unknown as ColabClient

    const flow = new ColabAuthenticationFlow(client)

    await flow.start()

    onStdout?.('Enter the authorization code: ')

    expect(() => flow.submitAuthorizationCode('   ')).toThrow('Authorization code cannot be empty.')
  })

  it('prevents two simultaneous authentication attempts', async () => {
    const command = createInteractiveCommand()

    const client = {
      start: vi.fn().mockResolvedValue(command)
    } as unknown as ColabClient

    const flow = new ColabAuthenticationFlow(client)

    await flow.start()

    await expect(flow.start()).rejects.toThrow('Colab authentication is already in progress.')
  })

  it('returns the completed command result', async () => {
    const command = createInteractiveCommand()

    const client = {
      start: vi.fn().mockResolvedValue(command)
    } as unknown as ColabClient

    const flow = new ColabAuthenticationFlow(client)

    await flow.start()

    await expect(flow.waitForResult()).resolves.toEqual({
      exitCode: 0,
      stdout: 'done',
      stderr: ''
    })
  })

  it('kills the command when authentication is cancelled', async () => {
    const command = createInteractiveCommand()

    const client = {
      start: vi.fn().mockResolvedValue(command)
    } as unknown as ColabClient

    const flow = new ColabAuthenticationFlow(client)

    await flow.start()

    flow.cancel()

    expect(command.kill).toHaveBeenCalled()
  })
})
