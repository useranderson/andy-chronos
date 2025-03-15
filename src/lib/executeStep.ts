import { Step } from "@prisma/client";
import { InternalStep } from "../entities/InternalStep";
import { prisma } from "../db/prismaClient";
import { StepStatus } from "../types";
import { executeAttempt } from "./excuteAttempt";
import { StopExecution } from "../entities/StopExecution";
import { FailExecution } from "../entities/Errors";
import { internalProcess } from "./internalProcess";

export const executeStep = async (parameters: {
  step: InternalStep;
  stepData?: Step;
  input: any;
  workflowId: number;
}) => {
  const { input, step, stepData, workflowId } = parameters;

  console.log(
    `[step]: Executando step ${step?.getName} com input: ${JSON.stringify(input)}`
  );

  const createdStep = stepData
    ? await internalProcess(
        prisma.step.update({
          where: { id: stepData.id },
          data:
            stepData.status === ("pending" as StepStatus)
              ? { retries: stepData.retries + 1, lastRetry: new Date() }
              : {},
        })
      )
    : await internalProcess(
        prisma.step.create({
          data: {
            workflowId: workflowId,
            input: input as any,
            lastRetry: new Date(),
            name: step?.getName || "anonymous",
            maxRetries: step?.getConfig.maxRetries,
            retries: 1,
          },
        })
      );

  try {
    if (stepData?.status === ("complete" as StepStatus)) {
      console.log(
        `[step]: O step ${step?.getName} já foi executado anteriormente e possui o outupt ${JSON.stringify(stepData.output)}`
      );
      return stepData.output;
    }

    const output = await executeAttempt({
      input,
      step,
      stepDataId: createdStep.id,
    });

    await internalProcess(
      prisma.step.update({
        where: { id: createdStep.id },
        data: { status: "complete" as StepStatus, output },
      })
    );

    return output;
  } catch (error: any) {
    if (error instanceof StopExecution) {
      await internalProcess(
        prisma.step.update({
          where: { id: createdStep.id },
          data: { status: "stopped" as StepStatus, output: error.value },
        })
      );

      console.log(
        `[step]: A execução do step foi parada com o valor ${JSON.stringify(error.value)}`
      );

      throw error;
    }

    const stepShouldFail =
      createdStep?.maxRetries && createdStep.retries >= createdStep.maxRetries;

    if (stepShouldFail) {
      await internalProcess(
        prisma.step.update({
          where: { id: createdStep.id },
          data: { status: "failed" as StepStatus },
        })
      );

      console.log(
        `[step]: Após ${createdStep.retries} tentativas, o step ${createdStep.name} será finalizado por falha`
      );
      throw new FailExecution(error);
    }

    console.log(`[step]: A execução do step terminou com erro`);

    throw error;
  }
};
