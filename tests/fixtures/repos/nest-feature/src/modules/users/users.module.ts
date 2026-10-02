import { Module } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UserRepository } from "./users.repository";

@Module({
  controllers: [UsersController],
  providers: [UsersService, UserRepository, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
