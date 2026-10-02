import { Controller, Get, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../../shared/roles.guard";
import { AuthService } from "./auth.service";

@Controller("auth")
@UseGuards(RolesGuard)
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
