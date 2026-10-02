import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma.service";

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.$queryRaw`select 1`;
  }
}
