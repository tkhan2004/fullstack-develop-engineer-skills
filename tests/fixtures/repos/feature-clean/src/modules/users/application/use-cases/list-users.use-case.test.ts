import { describe, expect, it } from "vitest";
import { ListUsersUseCase } from "./list-users.use-case";

describe("ListUsersUseCase", () => {
  it("returns dtos", async () => {
    const useCase = new ListUsersUseCase({ findAll: async () => [] });
    expect(await useCase.execute()).toEqual([]);
  });
});
