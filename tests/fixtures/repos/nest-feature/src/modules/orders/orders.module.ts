import { Module } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderRepository } from "./orders.repository";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrderRepository, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}
