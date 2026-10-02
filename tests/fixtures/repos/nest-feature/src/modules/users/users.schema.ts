import { IsInt } from "class-validator";

export class UsersSchema {
  @IsInt()
  id!: number;
}
