import { describe, expect, it } from "vitest";
import { OrderService } from "./order.service";

describe("OrderService", () => {
  it("can be constructed", () => {
    expect(new OrderService()).toBeDefined();
  });
});
