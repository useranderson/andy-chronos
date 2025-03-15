import fs from "fs";
import path from "path";
import { getPendingWorkflows } from "../db";

type WorkflowsType = Record<string, Function>;

export class Chronos {
  private workflowsDir: string;
  private workflows: WorkflowsType;

  constructor(args: { workflowsDir: string }) {
    const { workflowsDir } = args;

    this.workflows = {};
    this.workflowsDir = workflowsDir;
    console.log("[chronos]: Iniciando chronos...");
  }

  async loadWorkflows() {
    const loadWorkflows = async (workflowsDir: string) => {
      const workflows: Record<string, Function> = {};
      const files = fs.readdirSync(workflowsDir);

      for (const file of files) {
        if (file.endsWith(".js")) {
          const workflowName = path.basename(file, ".js");
          const modulePath = `file://${path.join(workflowsDir, file)}`;

          console.log(
            `[chronos]: Tentando carregar módulo do workflow: ${workflowName} (${modulePath})`
          );

          try {
            const importedModule = await import(modulePath);
            console.log("[chronos]: Módulo importado", importedModule);

            // 🚀 Ajuste para corrigir exportação aninhada
            const workflowFunction =
              importedModule?.default?.default || importedModule?.default;

            if (typeof workflowFunction !== "function") {
              console.error(
                `[chronos]: Erro: Workflow "${workflowName}" não exporta uma função válida`
              );
              continue;
            }

            workflows[workflowName] = workflowFunction;
          } catch (error) {
            console.error(
              `[chronos]: Erro ao carregar workflow "${workflowName}":`,
              error
            );
          }
        }
      }

      console.log(
        `[chronos]: Todos módulos de workflows carregados: ${JSON.stringify(
          Object.keys(workflows)
        )}`
      );
      return workflows;
    };

    console.log("[chronos]: Carregando workflows...");
    const workflows = await loadWorkflows(this.workflowsDir);
    this.workflows = workflows;
  }

  async processPendingWorkflows() {
    const processPendingWorkflows = async (workflows: WorkflowsType) => {
      console.log("[chronos]: Iniciando a fila de workflows");

      while (true) {
        const pendingWorkflows = await getPendingWorkflows();

        if (pendingWorkflows.length)
          console.log(
            `[chronos]: Encontrados ${pendingWorkflows.length} workflows pendentes`
          );

        for (const workflow of pendingWorkflows) {
          try {
            console.log(
              `[chronos]: Tentando executar workflow: ${workflow.name}`
            );

            const workflowFunction = workflows[workflow.name];

            if (typeof workflowFunction !== "function") {
              throw new Error(
                `[chronos]: Workflow "${workflow.name}" não é uma função válida!`
              );
            }

            await workflowFunction(workflow); // 🚀 Agora chama diretamente a função do workflow

            // await prisma.workflow.update({
            //   where: { id: workflow.id },
            //   data: { status: "complete" as WorkflowStatus, updatedAt: new Date() },
            // });
          } catch (error) {
            console.log(
              "[chronos]: Ocorreu um erro ao tentar executar o workflow",
              error
            );
          }
        }

        await new Promise((res) => setTimeout(res, 1000 * 3));
      }
    };

    await processPendingWorkflows(this.workflows);
  }
}
