import type { RenderOutputMode } from '../../shared/types'

export interface RenderWorkerStartedEvent {
  type: 'render-started'
  scene: string
  frame: number
  outputMode: RenderOutputMode
}

export interface RenderWorkerOutputSavedEvent {
  type: 'output-saved'
  scene: string
  frame: number
  path: string
}

export interface RenderWorkerFrameCompletedEvent {
  type: 'frame-completed'
  scene: string
  frame: number
  outputCount: number
}

export interface RenderWorkerCompletedEvent {
  type: 'render-completed'
  scene: string
  frame: number
}

export interface RenderWorkerErrorEvent {
  type: 'error'
  message: string
}

export type RenderWorkerEvent =
  | RenderWorkerStartedEvent
  | RenderWorkerOutputSavedEvent
  | RenderWorkerFrameCompletedEvent
  | RenderWorkerCompletedEvent
  | RenderWorkerErrorEvent
