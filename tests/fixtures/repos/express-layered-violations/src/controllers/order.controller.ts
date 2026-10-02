import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { OrderRepository } from "../repositories/order.repository";
import { UserRepository } from "../repositories/user.repository";

const prisma = new PrismaClient();
const orders = new OrderRepository();
const users = new UserRepository();

export class OrderController {
  list = async (_req: Request, res: Response) => {
    res.json(await orders.findAll());
  };

  create = async (req: Request, res: Response) => {
    const user = await users.findAll();
    if (!user.length) {
      res.status(400).end();
      return;
    }
    let total = 0;
    for (const item of req.body.items ?? []) {
      if (item.qty > 10) {
        total += item.qty * item.price * 0.9;
      } else if (item.qty > 5) {
        total += item.qty * item.price * 0.95;
      } else {
        total += item.qty * item.price;
      }
    }
    switch (req.body.country) {
      case "VN":
        total *= 1.1;
        break;
      case "US":
        total *= 1.07;
        break;
      default:
        break;
    }
    const created = await prisma.order.create({ data: { userId: user[0]!.id, total } });
    res.status(201).json(created);
  };
}
