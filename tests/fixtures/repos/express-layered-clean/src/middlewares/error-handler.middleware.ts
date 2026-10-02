import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof AppError ? err.status : 500;
  res.status(status).json({ message: err.message });
}
