import { WorkflowData } from "../types";
import { InternalWorkflow } from "./InternalWorkflow";
import { Step } from "./Step";

export class Workflow {
  private internalWorkflow: InternalWorkflow;
  private initialInput: any;

  constructor(parameters: { workflowData: WorkflowData }) {
    const { workflowData } = parameters;

    this.internalWorkflow = new InternalWorkflow({ workflowData });
    this.initialInput = workflowData.input;
  }
  start<Input>() {
    return new Step<Input, Input>({
      internalWorkflow: this.internalWorkflow,
      internalSteps: [],
      initialInput: this.initialInput,
    });
  }
}
