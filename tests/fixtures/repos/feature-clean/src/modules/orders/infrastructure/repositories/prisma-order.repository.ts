import { PrismaClient } from "@prisma/client";
import { Order } from "../../domain/entities/order.entity";
import type { OrderRepository } from "../../domain/repositories/order.repository";

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly prisma = new PrismaClient()) {}

  async findAll(): Promise<Order[]> {
    return (await this.prisma.order.findMany()).map((row) => new Order(row.id));
  }
}
