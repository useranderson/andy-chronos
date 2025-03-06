import {
  AttemptError,
  AttemptStatus,
  StepStatus,
  WorkflowData,
  WorkflowStatus,
} from "../types";
import { prisma } from "../db/prismaClient";
import { addMinutes } from "date-fns";

interface StepConfig {
  maxRetries?: number;
}

export class Step<Data> {
  private data: Data;
  private promise: ((data: Data) => Promise<any>) | null;
  private previous: Step<any>[];
  private workflowId: number;
  private stepsData: WorkflowData["steps"];
  private config: StepConfig;

  constructor(
    data: Data,
    previous: Step<Data>[],
    workflowId: number,
    steps: WorkflowData["steps"]
  ) {
    this.data = data;
    this.promise = null;
    this.previous = previous;
    this.workflowId = workflowId;
    this.stepsData = steps;
    this.config = { maxRetries: 0 };
  }

  step<Result>(fn: (data: Data) => Promise<Result>, config: StepConfig = {}) {
    this.promise = fn;
    this.config = { ...this.config, ...config };

    return new Step<Result>(
      null as Result,
      [...(this.previous as any), this],
      this.workflowId,
      this.stepsData
    );
  }

  async done() {
    console.log(`Iniciando a execução do workflow`);

    await prisma.workflow.update({
      where: { id: this.workflowId },
      data: { lastRetry: new Date() },
    });

    let lastResult = this.previous[0]?.data;
    let hasError = false;

    for (let i = 0; i < this.previous.length; i++) {
      console.log("Iniciando step...");

      const step = this.previous[i];
      const stepData = this.stepsData[i];

      if (stepData?.status === ("complete" as StepStatus)) {
        console.log("Step já foi executado previamente");
        lastResult = stepData.output;
        continue;
      }

      console.log(
        "Não encontrado valor anterior para esse step, rodando agora"
      );

      const createdStep = stepData
        ? stepData
        : await prisma.step.create({
            data: {
              input: lastResult,
              workflowId: this.workflowId,
              name: step?.promise?.name,
              maxRetries: step?.config.maxRetries || 0,
            },
          });

      const createdAttempt = await prisma.stepAttempt.create({
        data: { input: lastResult, stepId: createdStep.id },
      });

      try {
        lastResult = await step?.promise?.(lastResult);

        await prisma.step.update({
          where: { id: createdStep.id },
          data: { status: "complete" as StepStatus, output: lastResult },
        });

        await prisma.stepAttempt.update({
          where: { id: createdAttempt.id },
          data: { status: "complete" as AttemptStatus, output: lastResult },
        });
      } catch (error: any) {
        console.log(
          `Ocorreu um erro ao tentar executar o step: ${JSON.stringify(error)}`
        );

        if (
          createdStep.maxRetries &&
          createdStep.maxRetries > 0 &&
          createdStep.retries >= createdStep.maxRetries
        ) {
          await prisma.workflow.update({
            where: { id: this.workflowId },
            data: { status: "failed" as WorkflowStatus },
          });

          await prisma.step.update({
            where: { id: createdStep.id },
            data: { status: "failed" as StepStatus, lastRestry: new Date() },
          });
        } else {
          const nextRetry = addMinutes(new Date(), 1);

          console.log(
            `Uma nova tentativa será executada em: ${nextRetry.toString()}`
          );
          await prisma.workflow.update({
            where: { id: this.workflowId },
            data: { nextRetry },
          });

          await prisma.step.update({
            where: { id: createdStep.id },
            data: { retries: createdStep.retries + 1, lastRestry: new Date() },
          });
        }

        await prisma.stepAttempt.update({
          where: { id: createdAttempt.id },
          data: {
            status: "failed" as AttemptStatus,
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            } as AttemptError,
          },
        });

        hasError = true;
        break;
      }
    }
    if (!hasError) {
      await prisma.workflow.update({
        where: { id: this.workflowId },
        data: { status: "complete" as WorkflowStatus, updatedAt: new Date() },
      });
      console.log(`Workflow "${this.workflowId}" concluído!`);
    }
  }
}
