import { OrderService } from "../services/order.service";
import { PrismaClient } from "@prisma/client";
import { priceOf } from "../utils/pricing";

const prisma = new PrismaClient();
export const orderController = async () => ({ orders: await new OrderService().all(), count: await prisma.order.count(), price: priceOf(1) });
