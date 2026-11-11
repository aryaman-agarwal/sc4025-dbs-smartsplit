import { describe, expect, it } from "vitest";
import { allocateProportional, formatSGD, splitEqually, sum, toCents } from "./money";

describe("money helpers", () => {
  it("parses dollar strings into integer cents", () => {
    expect(toCents("$12.50")).toBe(1250);
    expect(toCents("12.5")).toBe(1250);
    expect(toCents("1,234")).toBe(123400);
    expect(toCents(0.1 + 0.2)).toBe(30); // float noise is removed
  });

  it("rejects invalid amounts", () => {
    expect(() => toCents("-5")).toThrow();
    expect(() => toCents("1.234")).toThrow();
    expect(() => toCents("abc")).toThrow();
  });

  it("formats cents as SGD", () => {
    expect(formatSGD(11990)).toBe("$119.90");
    expect(formatSGD(-4000)).toBe("-$40.00");
    expect(formatSGD(123456789)).toBe("$1,234,567.89");
  });

  it("splits equally and gives leftover cents to the first ids", () => {
    expect(splitEqually(1000, ["a", "b", "c"])).toEqual({ a: 334, b: 333, c: 333 });
  });

  it("allocates proportionally and always sums to the total", () => {
    const shares = allocateProportional(1001, { a: 1, b: 1, c: 1 });
    expect(sum(Object.values(shares))).toBe(1001);
    // gap goes to the largest share (first in a tie)
    expect(shares).toEqual({ a: 335, b: 333, c: 333 });
  });

  it("ignores zero weights", () => {
    expect(allocateProportional(500, { a: 0, b: 2 })).toEqual({ b: 500 });
  });
});
