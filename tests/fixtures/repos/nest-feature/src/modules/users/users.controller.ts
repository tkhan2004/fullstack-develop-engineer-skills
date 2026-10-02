import { Controller, Get, UseGuards } from "@nestjs/common";
import { RolesGuard } from "../../shared/roles.guard";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list() {
    return this.service.list();
  }
}
