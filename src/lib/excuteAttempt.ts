import { prisma } from "../db/prismaClient";
import { InternalStep } from "../entities/InternalStep";
import { StopExecution } from "../entities/StopExecution";
import { AttemptError, AttemptStatus } from "../types";
import { internalProcess } from "./internalProcess";

export const executeAttempt = async (parameters: {
  stepDataId: number;
  input: any;
  step: InternalStep;
}) => {
  const { input, step, stepDataId } = parameters;

  const attempt = await internalProcess(
    prisma.stepAttempt.create({
      data: { stepId: stepDataId, input },
    })
  );

  console.log(
    `[attempt]: Iniciando attempt do step com id ${stepDataId}, nome ${step.getName} e input ${JSON.stringify({ input })}`
  );

  try {
    if (step) {
      const output = await step.execute(input);

      await internalProcess(
        prisma.stepAttempt.update({
          where: { id: attempt.id },
          data: { output, status: "complete" as AttemptStatus },
        })
      );

      console.log(`[attempt]: A execução da attempt terminou com sucesso`);
      return output;
    }
  } catch (error: any) {
    if (error instanceof StopExecution) {
      await internalProcess(
        prisma.stepAttempt.update({
          where: { id: attempt.id },
          data: { output: error.value, status: "stopped" as AttemptStatus },
        })
      );

      console.log(
        `[attempt]: A execução da attempt foi parada: ${error.value}`
      );

      throw error;
    }

    await internalProcess(
      prisma.stepAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "failed" as AttemptStatus,
          error: {
            message: error.message || "",
            name: error.name || "",
            stack: error.stack,
          } as AttemptError,
        },
      })
    );

    console.log(`[attempt]: A execução da attempt falhou`);

    throw error;
  }
};
