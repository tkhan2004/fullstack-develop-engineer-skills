import { describe, expect, it } from "vitest";
import { ListOrdersUseCase } from "./list-orders.use-case";

describe("ListOrdersUseCase", () => {
  it("returns dtos", async () => {
    const useCase = new ListOrdersUseCase({ findAll: async () => [] });
    expect(await useCase.execute()).toEqual([]);
  });
});
