import { PrismaClient } from "@prisma/client";
import type { User } from "../models/user";

const prisma = new PrismaClient();

export class UserRepository {
  findAll(): Promise<User[]> {
    return prisma.user.findMany();
  }

  create(input: Omit<User, "id">): Promise<User> {
    return prisma.user.create({ data: input });
  }
}
