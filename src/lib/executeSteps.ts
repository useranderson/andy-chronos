import { InternalStep } from "../entities/InternalStep";
import { executeStep } from "./executeStep";
import { WorkflowData } from "../types";

export const executeSteps = async (parameters: {
  internalSteps: InternalStep[];
  workflowData: WorkflowData;
}) => {
  const { internalSteps, workflowData } = parameters;
  console.log(`[steps]: Executando steps do workflow ${workflowData.id}`);

  let input = workflowData.input as any;

  if (internalSteps.length) {
    for (let i = 0; i < internalSteps.length; i++) {
      const step = internalSteps[i];
      const stepData = workflowData.steps.find((s) => s.name === step?.getName);

      if (step) {
        input = await executeStep({
          input,
          step,
          stepData,
          workflowId: workflowData.id,
        });
      }
    }
  }
};
