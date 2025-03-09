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
    console.log("Iniciando chronos...");
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
            `Tentando carregar módulo do workflow: ${workflowName} (${modulePath})`
          );

          try {
            const importedModule = await import(modulePath);
            console.log("Módulo importado", importedModule);

            // 🚀 Ajuste para corrigir exportação aninhada
            const workflowFunction =
              importedModule?.default?.default || importedModule?.default;

            if (typeof workflowFunction !== "function") {
              console.error(
                `❌ Erro: Workflow "${workflowName}" não exporta uma função válida`
              );
              continue;
            }

            workflows[workflowName] = workflowFunction;
          } catch (error) {
            console.error(
              `❌ Erro ao carregar workflow "${workflowName}":`,
              error
            );
          }
        }
      }

      console.log(
        `Todos módulos de workflows carregados: ${JSON.stringify(
          Object.keys(workflows)
        )}`
      );
      return workflows;
    };

    console.log("Carregando workflows...");
    const workflows = await loadWorkflows(this.workflowsDir);
    this.workflows = workflows;
  }

  async processPendingWorkflows() {
    const processPendingWorkflows = async (workflows: WorkflowsType) => {
      console.log("Iniciando a fila de workflows");

      while (true) {
        const pendingWorkflows = await getPendingWorkflows();

        if (pendingWorkflows.length)
          console.log(
            `Encontrados ${pendingWorkflows.length} workflows pendentes`
          );

        for (const workflow of pendingWorkflows) {
          try {
            console.log(`Tentando executar workflow: ${workflow.name}`);

            const workflowFunction = workflows[workflow.name];

            if (typeof workflowFunction !== "function") {
              throw new Error(
                `❌ Workflow "${workflow.name}" não é uma função válida!`
              );
            }

            await workflowFunction(workflow); // 🚀 Agora chama diretamente a função do workflow

            // await prisma.workflow.update({
            //   where: { id: workflow.id },
            //   data: { status: "complete" as WorkflowStatus, updatedAt: new Date() },
            // });
          } catch (error) {
            console.log(
              "❌ Ocorreu um erro ao tentar executar o workflow",
              error
            );
          }
        }

        await new Promise((res) => setTimeout(res, 1000 * 15));
      }
    };

    await processPendingWorkflows(this.workflows);
  }
}
