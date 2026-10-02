import type { Request, Response } from "express";
import { UserRepository } from "../repositories/user.repository";

const repository = new UserRepository();

export class UserController {
  list = async (_req: Request, res: Response) => {
    res.json(await repository.findAll());
  };

  create = async (req: Request, res: Response) => {
    res.status(201).json(await repository.create(req.body));
  };
}
