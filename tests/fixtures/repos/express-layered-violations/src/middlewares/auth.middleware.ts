import type { NextFunction, Request, Response } from "express";
import { UserRepository } from "../repositories/user.repository";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const users = await new UserRepository().findAll();
  if (!req.headers.authorization || users.length === 0) {
    res.status(401).end();
    return;
  }
  next();
}
