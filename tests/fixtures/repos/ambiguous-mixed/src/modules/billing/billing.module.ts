import { UserManager } from "../../managers/user.manager";
import { priceOf } from "../../utils/pricing";

export const billing = { manager: UserManager, price: priceOf(2) };
