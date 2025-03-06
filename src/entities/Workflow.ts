import { WorkflowData } from "../types";
import { Step } from "./Step";

export class Workflow {
  private data: WorkflowData;

  constructor(workflowData: WorkflowData) {
    this.data = workflowData;
  }

  start<InitialData>() {
    return new Step(
      this.data.input as InitialData,
      [],
      this.data.id,
      this.data.steps || []
    );
  }
}
