import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.set("view engine", "ejs"); // Usando EJS para renderização

app.get("/", async (req, res) => {
  const workflows = await prisma.workflow.findMany({
    include: { steps: { include: { attempts: true } } }, // Inclui os steps de cada workflow
  });

  res.render("index", { workflows: workflows.reverse() });
});

app.listen(3000, () =>
  console.log("🚀 Server rodando em http://localhost:3000")
);
