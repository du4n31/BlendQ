import { cpus, freemem, totalmem } from 'node:os'

export interface HostCapabilities {
  logicalCpuCount: number
  totalMemoryBytes: number
  freeMemoryBytes: number
}

export function detectHostCapabilities(): HostCapabilities {
  const logicalCpuCount = cpus().length

  const totalMemoryBytes = totalmem()

  const freeMemoryBytes = freemem()

  if (logicalCpuCount < 1) {
    throw new Error('Failed to detect a valid logical CPU count.')
  }

  if (!Number.isSafeInteger(totalMemoryBytes) || totalMemoryBytes <= 0) {
    throw new Error('Failed to detect valid system memory.')
  }

  if (!Number.isSafeInteger(freeMemoryBytes) || freeMemoryBytes < 0) {
    throw new Error('Failed to detect valid free system memory.')
  }

  return {
    logicalCpuCount,
    totalMemoryBytes,
    freeMemoryBytes
  }
}
