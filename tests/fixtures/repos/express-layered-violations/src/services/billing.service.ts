import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { OrderController } from "../controllers/order.controller";

const prisma = new PrismaClient();

export const billingRouter = Router();

export async function invoice(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  return { order, controller: OrderController };
}
