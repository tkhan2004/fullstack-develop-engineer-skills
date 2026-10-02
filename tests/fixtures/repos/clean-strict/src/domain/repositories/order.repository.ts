import type { Order } from "../entities/order.entity";

export interface OrderRepository {
  findAll(): Promise<Order[]>;
}
