import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('node:os', () => ({
  cpus: vi.fn(),
  totalmem: vi.fn(),
  freemem: vi.fn()
}))

import { cpus, freemem, totalmem } from 'node:os'

import { detectHostCapabilities } from './host-capabilities'

const mockedCpus = vi.mocked(cpus)

const mockedTotalMemory = vi.mocked(totalmem)

const mockedFreeMemory = vi.mocked(freemem)

describe('detectHostCapabilities', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('detects CPU and memory capabilities', () => {
    mockedCpus.mockReturnValue(
      Array.from(
        {
          length: 16
        },
        () =>
          ({
            model: 'Test CPU',
            speed: 4000,
            times: {
              user: 0,
              nice: 0,
              sys: 0,
              idle: 0,
              irq: 0
            }
          }) as ReturnType<typeof cpus>[number]
      )
    )

    mockedTotalMemory.mockReturnValue(32 * 1024 ** 3)

    mockedFreeMemory.mockReturnValue(20 * 1024 ** 3)

    expect(detectHostCapabilities()).toEqual({
      logicalCpuCount: 16,
      totalMemoryBytes: 32 * 1024 ** 3,
      freeMemoryBytes: 20 * 1024 ** 3
    })
  })

  it('rejects an invalid CPU count', () => {
    mockedCpus.mockReturnValue([])

    mockedTotalMemory.mockReturnValue(32 * 1024 ** 3)

    mockedFreeMemory.mockReturnValue(20 * 1024 ** 3)

    expect(() => detectHostCapabilities()).toThrow('Failed to detect a valid logical CPU count.')
  })

  it('rejects invalid total memory', () => {
    mockedCpus.mockReturnValue([
      {
        model: 'Test CPU',
        speed: 4000,
        times: {
          user: 0,
          nice: 0,
          sys: 0,
          idle: 0,
          irq: 0
        }
      }
    ])

    mockedTotalMemory.mockReturnValue(0)

    mockedFreeMemory.mockReturnValue(0)

    expect(() => detectHostCapabilities()).toThrow('Failed to detect valid system memory.')
  })

  it('rejects invalid free memory', () => {
    mockedCpus.mockReturnValue([
      {
        model: 'Test CPU',
        speed: 4000,
        times: {
          user: 0,
          nice: 0,
          sys: 0,
          idle: 0,
          irq: 0
        }
      }
    ])

    mockedTotalMemory.mockReturnValue(32 * 1024 ** 3)

    mockedFreeMemory.mockReturnValue(-1)

    expect(() => detectHostCapabilities()).toThrow('Failed to detect valid free system memory.')
  })
})
