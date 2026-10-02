import type { OrderRepository } from "../../domain/repositories/order.repository";
import type { OrderDto } from "../dto/order.dto";

export class ListOrdersUseCase {
  constructor(private readonly repository: OrderRepository) {}

  async execute(): Promise<OrderDto[]> {
    return (await this.repository.findAll()).map((item) => ({ id: item.id }));
  }
}
