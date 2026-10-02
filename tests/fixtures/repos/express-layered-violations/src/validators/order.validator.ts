import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

const schema = z.object({ id: z.number().optional() });

export function validateOrder(req: Request, res: Response, next: NextFunction) {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error.flatten());
    return;
  }
  next();
}
