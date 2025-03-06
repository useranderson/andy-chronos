import { Workflow as WorkflowType, Step } from "@prisma/client";

export type WorkflowData = WorkflowType & { steps: Step[] };
export type WorkflowStatus = "pending" | "complete" | "failed";
export type StepStatus = "pending" | "complete" | "failed";
export type AttemptStatus = "pending" | "complete" | "failed";
export type AttemptError = { message: string; stack: string; name: string };
