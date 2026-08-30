export interface RenderWorkerAssignment {
  workerId: string
  frames: number[]
}

export interface DynamicRenderPlan {
  mode: 'dynamic'
}

export interface ExplicitRenderPlan {
  mode: 'explicit'
  assignments: RenderWorkerAssignment[]
}

export type RenderPlan = DynamicRenderPlan | ExplicitRenderPlan

interface ValidateExplicitRenderPlanOptions {
  selectedFrames: number[]
  workerIds: string[]
  plan: ExplicitRenderPlan
}

export function validateExplicitRenderPlan({
  selectedFrames,
  workerIds,
  plan
}: ValidateExplicitRenderPlanOptions): void {
  const selectedFrameSet = new Set(selectedFrames)
  const availableWorkerIds = new Set(workerIds)

  const assignedFrames = new Set<number>()
  const assignedWorkerIds = new Set<string>()

  for (const assignment of plan.assignments) {
    if (!availableWorkerIds.has(assignment.workerId)) {
      throw new Error(`Render plan references unknown worker "${assignment.workerId}".`)
    }

    if (assignedWorkerIds.has(assignment.workerId)) {
      throw new Error(`Worker "${assignment.workerId}" has more than one assignment.`)
    }

    assignedWorkerIds.add(assignment.workerId)

    for (const frame of assignment.frames) {
      if (!selectedFrameSet.has(frame)) {
        throw new Error(`Frame ${frame} is outside the selected frame range.`)
      }

      if (assignedFrames.has(frame)) {
        throw new Error(`Frame ${frame} is assigned to more than one worker.`)
      }

      assignedFrames.add(frame)
    }
  }

  const missingFrames = selectedFrames.filter((frame) => !assignedFrames.has(frame))

  if (missingFrames.length > 0) {
    throw new Error(
      `The render plan does not assign the following frames: ${missingFrames.join(', ')}.`
    )
  }
}
