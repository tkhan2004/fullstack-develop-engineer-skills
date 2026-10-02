import { IsInt } from "class-validator";

export class OrdersSchema {
  @IsInt()
  id!: number;
}
