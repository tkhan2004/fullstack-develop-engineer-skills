import express from "express";
import { listUsers } from "./controllers/user.controller";
import { listOrders } from "./controllers/order.controller";
import type { ListUsersUseCase } from "../../application/use-cases/list-users.use-case";
import type { ListOrdersUseCase } from "../../application/use-cases/list-orders.use-case";

export function createApp(useCases: { users: ListUsersUseCase; orders: ListOrdersUseCase }) {
  const app = express();
  app.get("/users", listUsers(useCases.users));
  app.get("/orders", listOrders(useCases.orders));
  return app;
}
