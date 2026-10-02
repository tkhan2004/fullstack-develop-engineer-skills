import type { Request, Response } from "express";
import { UserService } from "../services/user.service";

const service = new UserService();

export class UserController {
  list = async (_req: Request, res: Response) => {
    res.json(await service.list());
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(await service.create(req.body));
  };
}
