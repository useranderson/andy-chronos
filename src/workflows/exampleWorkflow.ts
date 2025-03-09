import { Workflow } from "../entities";
import { WorkflowData } from "../types";

export default async (workflowData: WorkflowData) => {
  const workflow = new Workflow({ workflowData });

  return await workflow
    .start<{ name: string }>()
    .step(async function receiveNameObject(params) {
      const { name } = params;
      return { upperCaseName: name.toUpperCase() };
    })
    .step(
      async function nameLenght(params) {
        if (1 < 2) {
          // throw new Error("");
        }

        return params.upperCaseName.length;
      },
      { maxRetries: 3 }
    )
    .step(async function double(params) {
      return params * 2;
    })
    .end();
};
