import { UserRepository } from "../repositories/user.repository";
import type { User } from "../models/user";
import { AppError } from "../utils/app-error";

export class UserService {
  private readonly repository = new UserRepository();

  list(): Promise<User[]> {
    return this.repository.findAll();
  }

  async create(input: Omit<User, "id">): Promise<User> {
    if (!input) throw new AppError("Invalid input", 400);
    return this.repository.create(input);
  }
}
