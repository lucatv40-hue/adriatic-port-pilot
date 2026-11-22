import { describe, expect, it } from "vitest";
import { isOver } from "@/lib/thresholds";
describe("soglie", () => {
  it("rosso sopra soglia", () => expect(isOver(21, 20)).toBe(true));
  it("non rosso a soglia esatta", () => expect(isOver(20, 20)).toBe(false));
  it("dato mancante mai rosso", () => expect(isOver(null, 20)).toBe(false));
});
