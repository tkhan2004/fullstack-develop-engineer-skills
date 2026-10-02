import express from "express";
import { ListUsersUseCase } from "./modules/users";
import { PrismaUserRepository, listUsers } from "./modules/users";
import { ListOrdersUseCase, PrismaOrderRepository, listOrders } from "./modules/orders";
import { env } from "./config/env";

const app = express();
app.get("/users", listUsers(new ListUsersUseCase(new PrismaUserRepository())));
app.get("/orders", listOrders(new ListOrdersUseCase(new PrismaOrderRepository())));
app.listen(env.port);
