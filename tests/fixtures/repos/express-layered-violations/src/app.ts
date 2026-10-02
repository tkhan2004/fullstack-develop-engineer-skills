import express from "express";
import { userRoutes } from "./routes/user.routes";
import { orderRoutes } from "./routes/order.routes";
import { errorHandler } from "./middlewares/error-handler.middleware";

export const app = express();
app.use(express.json());
app.use("/users", userRoutes);
app.use("/orders", orderRoutes);
app.use(errorHandler);
