import { Injectable } from "@nestjs/common";
import { UsersService } from "../users";
import { AuthRepository } from "./auth.repository";

@Injectable()
export class AuthService {
  constructor(private readonly repository: AuthRepository, private readonly users: UsersService) {}

  list() {
    return this.repository.findAll();
  }
}
