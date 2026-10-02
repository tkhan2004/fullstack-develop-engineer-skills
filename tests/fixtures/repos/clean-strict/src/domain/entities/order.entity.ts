import { DomainError } from "../errors/domain-error";

export class Order {
  constructor(readonly id: number) {
    if (id < 0) throw new DomainError("invalid id");
  }
}
