import type { Request, Response } from "express";
import type { ListUsersUseCase } from "../../application/use-cases/list-users.use-case";

export const listUsers = (useCase: ListUsersUseCase) => async (_req: Request, res: Response) => {
  res.json(await useCase.execute());
};
