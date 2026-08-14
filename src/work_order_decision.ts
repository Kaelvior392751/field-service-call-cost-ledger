import { z } from "zod";

export const dispatchStatuses = [
  "awaiting_review",
  "dispatched",
  "technician_follow_up",
] as const;

export const modelAssessmentSchema = z.object({
  summary: z.string().min(1),
  proposedDispatchStatus: z.enum(dispatchStatuses),
  technicianFollowUp: z.string().min(1),
});

export type DispatchStatus = (typeof dispatchStatuses)[number];
export type ModelAssessment = z.infer<typeof modelAssessmentSchema>;

export interface WorkOrderDecision {
  dispatchStatus: DispatchStatus;
  technicianFollowUp: string;
}

export function decideWorkOrderUpdate(
  currentStatus: DispatchStatus,
  assessment: ModelAssessment,
): WorkOrderDecision {
  if (currentStatus === "awaiting_review") {
    return {
      dispatchStatus: assessment.proposedDispatchStatus,
      technicianFollowUp: assessment.technicianFollowUp,
    };
  }

  return {
    dispatchStatus: currentStatus,
    technicianFollowUp: assessment.technicianFollowUp,
  };
}
