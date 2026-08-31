import { describe, expect, it } from 'vitest'

import type { HostCapabilities } from '../system/host-capabilities'
import { recommendLocalConcurrency } from './local-concurrency-recommendation'

const GIBIBYTE = 1024 ** 3

describe('recommendLocalConcurrency', () => {
  it('recommends one worker for a constrained host', () => {
    const capabilities: HostCapabilities = {
      logicalCpuCount: 4,
      totalMemoryBytes: 8 * GIBIBYTE,
      freeMemoryBytes: 4 * GIBIBYTE
    }

    expect(recommendLocalConcurrency(capabilities)).toEqual({
      recommendedWorkers: 1,
      maximumWorkers: 1,
      reasons: ['BlendQ is using one local worker to reduce CPU and memory pressure.']
    })
  })

  it('recommends two workers for a capable host', () => {
    const capabilities: HostCapabilities = {
      logicalCpuCount: 16,
      totalMemoryBytes: 32 * GIBIBYTE,
      freeMemoryBytes: 24 * GIBIBYTE
    }

    expect(recommendLocalConcurrency(capabilities)).toEqual({
      recommendedWorkers: 2,
      maximumWorkers: 2,
      reasons: ['The host has enough CPU capacity and free memory for limited local concurrency.']
    })
  })

  it('keeps one worker when memory is low even with many CPUs', () => {
    const capabilities: HostCapabilities = {
      logicalCpuCount: 16,
      totalMemoryBytes: 16 * GIBIBYTE,
      freeMemoryBytes: 8 * GIBIBYTE
    }

    expect(recommendLocalConcurrency(capabilities).recommendedWorkers).toBe(1)
  })

  it('keeps one worker when CPU capacity is low even with free memory', () => {
    const capabilities: HostCapabilities = {
      logicalCpuCount: 4,
      totalMemoryBytes: 32 * GIBIBYTE,
      freeMemoryBytes: 24 * GIBIBYTE
    }

    expect(recommendLocalConcurrency(capabilities).recommendedWorkers).toBe(1)
  })
})
