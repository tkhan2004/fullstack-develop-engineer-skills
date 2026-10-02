import type { NextFunction, Request, Response } from "express";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  if (!req.headers.authorization) {
    res.status(401).end();
    return;
  }
  next();
}
