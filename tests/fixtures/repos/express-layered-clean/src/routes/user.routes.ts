import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { validateUser } from "../validators/user.validator";
import { authenticate } from "../middlewares/auth.middleware";

export const userRoutes = Router();
const controller = new UserController();

userRoutes.get("/", authenticate, controller.list);
userRoutes.post("/", authenticate, validateUser, controller.create);
