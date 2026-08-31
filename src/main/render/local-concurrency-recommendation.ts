import type { HostCapabilities } from '../system/host-capabilities'

export interface LocalConcurrencyRecommendation {
  recommendedWorkers: number
  maximumWorkers: number
  reasons: string[]
}

const GIBIBYTE = 1024 ** 3

export function recommendLocalConcurrency(
  capabilities: HostCapabilities
): LocalConcurrencyRecommendation {
  const reasons: string[] = []

  let maximumWorkers = 1

  if (capabilities.logicalCpuCount >= 8 && capabilities.freeMemoryBytes >= 16 * GIBIBYTE) {
    maximumWorkers = 2

    reasons.push('The host has enough CPU capacity and free memory for limited local concurrency.')
  } else {
    reasons.push('BlendQ is using one local worker to reduce CPU and memory pressure.')
  }

  return {
    recommendedWorkers: maximumWorkers,
    maximumWorkers,
    reasons
  }
}
