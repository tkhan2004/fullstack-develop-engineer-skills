import { OrderService } from "../services/order.service";
import { sluggify } from "../helpers/slug";

export class UserManager {
  current() {
    return { slug: sluggify("me"), orders: new OrderService() };
  }
}
