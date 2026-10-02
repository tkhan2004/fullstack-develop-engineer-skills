import { PrismaClient } from "@prisma/client";
import type { Order } from "../models/order";

const prisma = new PrismaClient();

export class OrderRepository {
  findAll(): Promise<Order[]> {
    return prisma.order.findMany();
  }

  create(input: Omit<Order, "id">): Promise<Order> {
    return prisma.order.create({ data: input });
  }
}
