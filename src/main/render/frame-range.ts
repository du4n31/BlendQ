import type { FrameRange } from '../../shared/types'

export function createFrameSequence(frameRange: FrameRange): number[] {
  const { start, end, step } = frameRange

  if (!Number.isSafeInteger(start)) {
    throw new Error('Frame range start must be an integer.')
  }

  if (!Number.isSafeInteger(end)) {
    throw new Error('Frame range end must be an integer.')
  }

  if (!Number.isSafeInteger(step) || step < 1) {
    throw new Error('Frame range step must be a positive integer.')
  }

  if (start > end) {
    throw new Error('Frame range start cannot be greater than the end.')
  }

  const frames: number[] = []

  for (let frame = start; frame <= end; frame += step) {
    frames.push(frame)
  }

  return frames
}
