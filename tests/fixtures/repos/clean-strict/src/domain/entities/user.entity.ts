import { DomainError } from "../errors/domain-error";

export class User {
  constructor(readonly id: number) {
    if (id < 0) throw new DomainError("invalid id");
  }
}
