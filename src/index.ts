import { Chronos } from "./entities";
import path from "path";

// exemplo de implementação
const workflowsDir = path.join(__dirname, "../dist/workflows");

const main = async () => {
  const chronos = new Chronos({ workflowsDir });
  await chronos.loadWorkflows();
  await chronos.processPendingWorkflows();
};

main().catch(() => console.log("error"));
