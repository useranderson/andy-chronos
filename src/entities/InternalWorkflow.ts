import { addSeconds } from "date-fns";
import { prisma } from "../db/prismaClient";
import {
  AttemptError,
  AttemptStatus,
  StepStatus,
  WorkflowData,
  WorkflowStatus,
} from "../types";
import { InternalStep } from "./InternalStep";
import { StopExecution } from "./StopExecution";

export class InternalWorkflow {
  private workflowData: WorkflowData;

  constructor(parameters: { workflowData: WorkflowData }) {
    const { workflowData } = parameters;
    this.workflowData = workflowData;
  }

  async execute(internalSteps: InternalStep[]) {
    console.log("Executando workflow:", this.workflowData.name);
    try {
      await prisma.workflow.update({
        where: { id: this.workflowData.id },
        data: { lastRetry: new Date(), nextRetry: new Date() },
      });

      let input = this.workflowData.input;

      for (let i = 0; i < internalSteps.length; i++) {
        const step = internalSteps[i];
        const stepData = this.workflowData.steps.find(
          (s) => s.name === step?.getName
        );

        console.log(
          `Executando step ${step?.getName} com input: ${JSON.stringify(input)}`
        );

        const createdStep = stepData
          ? await prisma.step.update({
              where: { id: stepData.id },
              data:
                stepData.status === ("pending" as StepStatus)
                  ? { retries: stepData.retries + 1, lastRetry: new Date() }
                  : {},
            })
          : await prisma.step.create({
              data: {
                workflowId: this.workflowData.id,
                input: input as any,
                lastRetry: new Date(),
                name: step?.getName || "anonymous",
                maxRetries: step?.getConfig.maxRetries,
                retries: 1,
              },
            });

        if (stepData?.status === ("complete" as StepStatus)) {
          console.log(
            `O step ${step?.getName} já foi executado anteriormente e possui o outupt ${JSON.stringify(stepData.output)}`
          );
          input = stepData.output;
          continue;
        }

        const attempt = await prisma.stepAttempt.create({
          data: { stepId: createdStep.id, input: input as any },
        });

        try {
          if (step) {
            const output = await step.execute(input);

            await prisma.step.update({
              where: { id: createdStep.id },
              data: { status: "complete" as StepStatus, output },
            });

            await prisma.stepAttempt.update({
              where: { id: attempt.id },
              data: { output, status: "complete" as AttemptStatus },
            });
            input = output;
          }
        } catch (err: any) {
          if (err instanceof StopExecution) {
            await prisma.step.update({
              where: { id: createdStep.id },
              data: { status: "complete" as StepStatus, output: err.value },
            });

            await prisma.stepAttempt.update({
              where: { id: attempt.id },
              data: { output: err.value },
            });

            break;
          } else {
            console.log(`Ocorreu erro ao executar o step ${step?.getName}`);

            await prisma.stepAttempt.update({
              where: { id: attempt.id },
              data: {
                status: "failed" as AttemptStatus,
                error: {
                  message: err.message || "",
                  name: err.name || "",
                  stack: err.stack,
                } as AttemptError,
              },
            });

            if (
              createdStep?.maxRetries &&
              createdStep.retries >= createdStep.maxRetries
            ) {
              console.log(
                `Após ${createdStep.retries} tentativas, o step ${createdStep.name} será finalizado por falha`
              );
              await prisma.step.update({
                where: { id: createdStep.id },
                data: { status: "failed" as StepStatus },
              });

              console.log(
                `O workflow ${this.workflowData.name} falhou devideo ao step ${createdStep.name}`
              );
              await prisma.workflow.update({
                where: { id: this.workflowData.id },
                data: { status: "failed" as WorkflowStatus },
              });
            } else {
              const nextRetry = addSeconds(new Date(), 30);
              console.log(
                `Houve falha em um dos steps do workflow ${this.workflowData.name}, uma nova tentativa acontecerá em ${nextRetry.toLocaleString()}`
              );
              await prisma.workflow.update({
                where: { id: this.workflowData.id },
                data: { nextRetry },
              });
            }

            throw err;
          }
        }
      }
      console.log(`Workflow ${this.workflowData.name} finalizado com sucesso`);
      await prisma.workflow.update({
        where: { id: this.workflowData.id },
        data: { status: "complete" as WorkflowStatus },
      });
    } catch (error) {}
  }
}
