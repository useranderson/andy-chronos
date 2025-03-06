import { WorkflowStatus } from "../types";
import { prisma } from "./prismaClient";

export async function getWorkflow(workflowId: number) {
  return await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: { steps: true },
  });
}

export async function getPendingWorkflows() {
  return await prisma.workflow.findMany({
    where: {
      status: { in: ["pending"] as WorkflowStatus[] },
      nextRetry: { lte: new Date() },
    },
    include: { steps: true },
  });
}

export async function createWorkflow(name: string, initialArgs: any) {
  return await prisma.workflow.create({
    data: { name, input: initialArgs },
  });
}
