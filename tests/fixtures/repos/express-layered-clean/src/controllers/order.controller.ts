import type { Request, Response } from "express";
import { OrderService } from "../services/order.service";

const service = new OrderService();

export class OrderController {
  list = async (_req: Request, res: Response) => {
    res.json(await service.list());
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(await service.create(req.body));
  };
}
