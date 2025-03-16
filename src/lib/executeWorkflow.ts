import { prisma } from "../db/prismaClient";
import { InternalStep } from "../entities/InternalStep";
import { WorkflowData, WorkflowStatus } from "../types";
import { internalProcess } from ".";
import { StopExecution } from "../entities/StopExecution";
import { FailExecution } from "../entities/Errors";
import { executeSteps } from "./executeSteps";
import { addSeconds } from "date-fns";

export const executeWorkflow = async (parameters: {
  workflowData: WorkflowData;
  internalSteps: InternalStep[];
}) => {
  const { internalSteps, workflowData } = parameters;
  console.log(`[workflow]: Executando workflow ${workflowData.name}`);

  try {
    await internalProcess(
      prisma.workflow.update({
        where: { id: workflowData.id },
        data: { lastRetry: new Date(), nextRetry: new Date() },
      })
    );

    await executeSteps({ internalSteps, workflowData });

    await internalProcess(
      prisma.workflow.update({
        where: { id: workflowData.id },
        data: { status: "complete" as WorkflowStatus },
      })
    );

    console.log(
      `[workflow]: Workflow ${workflowData.name} finalizado com sucesso`
    );
  } catch (error) {
    if (error instanceof StopExecution) {
      console.log(
        `[workflow]: Workdlow ${workflowData.id} foi parado com output ${JSON.stringify(error.value)}`
      );

      await internalProcess(
        prisma.workflow.update({
          where: { id: workflowData.id },
          data: { status: "stopped" as WorkflowStatus },
        })
      );

      return;
    }

    if (error instanceof FailExecution) {
      await internalProcess(
        prisma.workflow.update({
          where: { id: workflowData.id },
          data: { status: "failed" as WorkflowStatus },
        })
      );

      console.log(
        `[workflow]: Não foi possivel finalizar um dos steps e por isso o workflow ${workflowData.id} será finalizado com falha`
      );

      return;
    }

    const nextRetry = addSeconds(new Date(), 5);

    await internalProcess(
      prisma.workflow.update({
        where: { id: workflowData.id },
        data: { nextRetry },
      })
    );

    console.log(
      `[workflow]: Houve falha em um dos steps do workflow ${workflowData.name}, uma nova tentativa acontecerá em ${nextRetry.toLocaleString()}`
    );

    return;
  }
};
