import { InternalError } from "../entities/Errors";

export const internalProcess = async <Output>(prm: Promise<Output>) => {
  return prm.catch((error) => {
    console.log("Erro interno", { error });

    throw new InternalError(error);
  });
};
