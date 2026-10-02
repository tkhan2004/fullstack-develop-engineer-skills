import type { ListUsersUseCase } from "../../../users";
import { log } from "../../../../shared/logger";

export class PlaceOrderUseCase {
  constructor(private readonly users: ListUsersUseCase) {}

  async execute() {
    log("placing order");
    return this.users.execute();
  }
}
