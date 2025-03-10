import { createWorkflow } from "./db";

createWorkflow("exampleWorkflow", {
  id: 1,
  team_id: 1,
});

createWorkflow("exampleWorkflow", {
  id: 2,
  team_id: 1,
});
