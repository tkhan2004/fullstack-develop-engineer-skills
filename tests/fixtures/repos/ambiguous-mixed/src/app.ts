import express from "express";
import { orderController } from "./controllers/order.controller";
import { helperLog } from "./helpers/log";

export const app = express();
helperLog("boot");
app.get("/orders", orderController);
