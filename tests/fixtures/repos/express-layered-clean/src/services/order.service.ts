import { OrderRepository } from "../repositories/order.repository";
import type { Order } from "../models/order";
import { AppError } from "../utils/app-error";

export class OrderService {
  private readonly repository = new OrderRepository();

  list(): Promise<Order[]> {
    return this.repository.findAll();
  }

  async create(input: Omit<Order, "id">): Promise<Order> {
    if (!input) throw new AppError("Invalid input", 400);
    return this.repository.create(input);
  }
}
