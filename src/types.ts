import { Workflow as WorkflowType, Step } from "@prisma/client";

export type WorkflowData = WorkflowType & { steps: Step[] };
export type WorkflowStatus = "pending" | "complete" | "failed" | "running";
export type StepStatus = "pending" | "complete" | "failed";
export type AttemptStatus = "pending" | "complete" | "failed";
export type AttemptError = { message: string; stack: string; name: string };

export interface StepArgs<Input> {
  stop: (data?: unknown) => void;
  initialInput: Input;
}

export interface StepConfig {
  maxRetries?: number;
}

export type StepExecute<Input, Result, InitialInput> = (
  input: Input,
  stepControlls: StepArgs<InitialInput>
) => Promise<Result>;
