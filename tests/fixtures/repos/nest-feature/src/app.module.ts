import { Module } from "@nestjs/common";
import { UsersModule } from "./modules/users";
import { OrdersModule } from "./modules/orders";
import { AuthModule } from "./modules/auth";

@Module({ imports: [UsersModule, OrdersModule, AuthModule] })
export class AppModule {}
