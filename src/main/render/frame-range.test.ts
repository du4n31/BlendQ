import { describe, expect, it } from 'vitest'

import { createFrameSequence } from './frame-range'

describe('createFrameSequence', () => {
  it('creates a consecutive frame sequence', () => {
    expect(
      createFrameSequence({
        start: 1,
        end: 5,
        step: 1
      })
    ).toEqual([1, 2, 3, 4, 5])
  })

  it('respects the frame step', () => {
    expect(
      createFrameSequence({
        start: 1,
        end: 10,
        step: 3
      })
    ).toEqual([1, 4, 7, 10])
  })

  it('creates a sequence containing one frame', () => {
    expect(
      createFrameSequence({
        start: 42,
        end: 42,
        step: 1
      })
    ).toEqual([42])
  })

  it('does not exceed the end frame when the step does not land on it', () => {
    expect(
      createFrameSequence({
        start: 2,
        end: 10,
        step: 3
      })
    ).toEqual([2, 5, 8])
  })

  it('rejects a start frame greater than the end frame', () => {
    expect(() =>
      createFrameSequence({
        start: 10,
        end: 1,
        step: 1
      })
    ).toThrow('Frame range start cannot be greater than the end.')
  })

  it('rejects a zero step', () => {
    expect(() =>
      createFrameSequence({
        start: 1,
        end: 10,
        step: 0
      })
    ).toThrow('Frame range step must be a positive integer.')
  })

  it('rejects a negative step', () => {
    expect(() =>
      createFrameSequence({
        start: 1,
        end: 10,
        step: -1
      })
    ).toThrow('Frame range step must be a positive integer.')
  })

  it('rejects non-integer frame values', () => {
    expect(() =>
      createFrameSequence({
        start: 1.5,
        end: 10,
        step: 1
      })
    ).toThrow('Frame range start must be an integer.')

    expect(() =>
      createFrameSequence({
        start: 1,
        end: 10.5,
        step: 1
      })
    ).toThrow('Frame range end must be an integer.')

    expect(() =>
      createFrameSequence({
        start: 1,
        end: 10,
        step: 1.5
      })
    ).toThrow('Frame range step must be a positive integer.')
  })
})
