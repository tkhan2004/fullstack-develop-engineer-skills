import { PrismaClient } from "@prisma/client";
import { User } from "../../domain/entities/user.entity";
import type { UserRepository } from "../../domain/repositories/user.repository";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma = new PrismaClient()) {}

  async findAll(): Promise<User[]> {
    return (await this.prisma.user.findMany()).map((row) => new User(row.id));
  }
}
