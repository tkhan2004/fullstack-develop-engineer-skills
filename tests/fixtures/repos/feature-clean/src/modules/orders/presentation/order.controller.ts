import type { Request, Response } from "express";
import type { ListOrdersUseCase } from "../../application/use-cases/list-orders.use-case";

export const listOrders = (useCase: ListOrdersUseCase) => async (_req: Request, res: Response) => {
  res.json(await useCase.execute());
};
