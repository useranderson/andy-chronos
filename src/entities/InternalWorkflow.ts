import { WorkflowData } from "../types";
import { InternalStep } from "./InternalStep";
import { executeWorkflow } from "../lib";

export class InternalWorkflow {
  private workflowData: WorkflowData;

  constructor(parameters: { workflowData: WorkflowData }) {
    const { workflowData } = parameters;
    this.workflowData = workflowData;
  }

  async execute(internalSteps: InternalStep[]) {
    try {
      await executeWorkflow({ internalSteps, workflowData: this.workflowData });
    } catch (error) {}
  }
}
