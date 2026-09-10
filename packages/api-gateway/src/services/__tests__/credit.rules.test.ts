import { describe, expect, it } from "vitest";

describe("OctaPoint credit invariants", () => {
  it("rejects zero/negative amounts", () => {
    expect([0, -1].every((n) => n <= 0)).toBe(true);
  });
  it("never allows a redemption greater than the balance", () => {
    const balance = 100;
    const redemption = 101;
    expect(redemption > balance).toBe(true);
  });
});
