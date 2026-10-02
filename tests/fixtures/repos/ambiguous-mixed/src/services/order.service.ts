import { PrismaClient } from "@prisma/client";
import { tax } from "../common/tax";
import { orderController } from "../controllers/order.controller";

const prisma = new PrismaClient();
export const handlerRef = orderController;
export class OrderService {
  all() {
    return prisma.order.findMany().then((rows) => rows.map((r) => ({ ...r, tax: tax(1) })));
  }
}
