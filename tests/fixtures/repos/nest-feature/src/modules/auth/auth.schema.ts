import { IsInt } from "class-validator";

export class AuthSchema {
  @IsInt()
  id!: number;
}
