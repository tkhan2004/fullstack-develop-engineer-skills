import { Injectable } from "@nestjs/common";
import { UsersService } from "../users";
import { OrderRepository } from "./orders.repository";

@Injectable()
export class OrdersService {
  constructor(private readonly repository: OrderRepository, private readonly users: UsersService) {}

  list() {
    return this.repository.findAll();
  }
}
