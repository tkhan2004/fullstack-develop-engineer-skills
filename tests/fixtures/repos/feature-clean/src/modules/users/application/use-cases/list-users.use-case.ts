import type { UserRepository } from "../../domain/repositories/user.repository";
import type { UserDto } from "../dto/user.dto";

export class ListUsersUseCase {
  constructor(private readonly repository: UserRepository) {}

  async execute(): Promise<UserDto[]> {
    return (await this.repository.findAll()).map((item) => ({ id: item.id }));
  }
}
