import { Controller, Get, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../../shared/roles.guard";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
