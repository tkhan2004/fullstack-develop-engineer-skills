import { describe, expect, it } from "vitest";
import { UserService } from "./user.service";

describe("UserService", () => {
  it("can be constructed", () => {
    expect(new UserService()).toBeDefined();
  });
});
