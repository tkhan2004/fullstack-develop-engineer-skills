import { Injectable } from "@nestjs/common";
import { UserRepository } from "./users.repository";

@Injectable()
export class UsersService {
  constructor(private readonly repository: UserRepository) {}

  list() {
    return this.repository.findAll();
  }
}
