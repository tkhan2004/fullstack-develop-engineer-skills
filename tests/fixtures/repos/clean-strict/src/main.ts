import { createApp } from "./presentation/http/app";
import { ListUsersUseCase } from "./application/use-cases/list-users.use-case";
import { ListOrdersUseCase } from "./application/use-cases/list-orders.use-case";
import { PrismaUserRepository } from "./infrastructure/repositories/prisma-user.repository";
import { PrismaOrderRepository } from "./infrastructure/repositories/prisma-order.repository";
import { env } from "./config/env";

createApp({
  users: new ListUsersUseCase(new PrismaUserRepository()),
  orders: new ListOrdersUseCase(new PrismaOrderRepository()),
}).listen(env.port);
