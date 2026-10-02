import { UserManager } from "../managers/user.manager";

export const userController = () => new UserManager().current();
