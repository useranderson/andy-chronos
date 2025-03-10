import { Workflow } from "../entities";
import { WorkflowData } from "../types";

export default async (workflowData: WorkflowData) => {
  const workflow = new Workflow({ workflowData });

  return await workflow
    .start<{ id: number; team_id: number }>()
    .step(async function checkIfParamsExists(params, stepControll) {
      const { id, team_id } = params;
      const { stop } = stepControll;

      // Em qualquer step pode ser o stop pode ser usado
      // para interromper todo o workflow
      if (!id) stop("id is required");
      if (!team_id) stop("team_id is required");

      return { id, team_id };
    })
    // .all agrupa vários steps porém todos recebem o mesmo input
    // e retorna um objeto com o retorno de de todos os steps
    .all<{ getUserData: User; getEmailTemplate: EmailTemplate }>((steps) =>
      steps()
        .step(async function getUserData(params, stepControll) {
          const { id } = params;
          const { stop } = stepControll;

          const user = await getUserById(id);

          if (!user) stop("User not found");

          return user;
        })
        .step(async function getEmailTemplate(params, stepControll) {
          const { team_id } = params;
          const { stop } = stepControll;

          const template = await getTemplateByTeamId(team_id);

          if (!template) stop("Template not found");

          return template;
        })
        // o .all precisa de um ponto .end
        .end()
    )
    .step(
      async function sendEmail(params) {
        const { getEmailTemplate: template, getUserData: userData } = params;

        await sendEmailService(userData.email, template.text);
        // propositalmente não passando o userData
      },
      // todos os steps podem ser configurados e sobreescrever as
      // configurações padrões
      { maxRetries: 3 }
    )
    .step(async function createNotification(_, stepControll) {
      // em todos os steps o initialInput estará disponivel
      const { initialInput } = stepControll;
      const text = `user ${initialInput.id} from team ${initialInput.team_id} was successfully invited`;
      await nofity(initialInput.id, text);

      return text;
    })
    // o workflow precisa de um .end
    .end();
};

//

interface User {
  id: number;
  email: string;
}

interface EmailTemplate {
  team_id: number;
  text: string;
}

const users: User[] = [
  { email: "email@email.com", id: 1 },
  { email: "invalid@email.com", id: 2 },
];
const emailTemplates: EmailTemplate[] = [
  { team_id: 1, text: `Você foi convidado para o time 1` },
];

const wait = (secs: number) => {
  return new Promise((resolve) => setTimeout(resolve, 1000 * secs));
};

const random = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const getUserById = async (id: number) => {
  await wait(random(1, 3));
  return users.find((u) => u.id === id);
};
const getTemplateByTeamId = async (team_id: number) => {
  await wait(random(1, 3));
  return emailTemplates.find((e) => e.team_id === team_id);
};

const sendEmailService = async (email: string, text: string) => {
  if (email === "invalid@email.com")
    throw new Error("Api error: invalid email");

  await wait(random(1, 3));
};

const nofity = async (userId: number, text: string) => {
  await wait(random(1, 3));
};
