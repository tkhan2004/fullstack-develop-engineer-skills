import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { validateOrder } from "../validators/order.validator";
import { authenticate } from "../middlewares/auth.middleware";

export const orderRoutes = Router();
const controller = new OrderController();

orderRoutes.get("/", authenticate, controller.list);
orderRoutes.post("/", authenticate, validateOrder, controller.create);
