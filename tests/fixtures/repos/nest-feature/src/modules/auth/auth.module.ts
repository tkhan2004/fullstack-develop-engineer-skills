import { Module } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, PrismaService],
  exports: [AuthService],
})
export class AuthModule {}
