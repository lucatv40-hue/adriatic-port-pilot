import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { canTrack, readChoice, saveChoices } from "@/lib/consent";
describe("Purpose-specific consent", () => {
  beforeEach(() => { localStorage.clear(); Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: false }); });
  afterEach(() => { vi.restoreAllMocks(); });
  it("rejecting analytics blocks optional analytics", async () => { saveChoices({ analytics: "denied" }); expect(await canTrack("analytics")).toBe(false); });
  it("accepting analytics does not grant advertising", () => { saveChoices({ analytics: "granted" }); expect(readChoice("advertising")).toBeNull(); });
  it("a later rejection overrides acceptance", async () => { saveChoices({ analytics: "granted" }); saveChoices({ analytics: "denied" }); expect(await canTrack("analytics")).toBe(false); });
  it("the browser privacy signal overrides acceptance", async () => { saveChoices({ analytics: "granted" }); Object.defineProperty(navigator, "globalPrivacyControl", { configurable: true, value: true }); expect(await canTrack("analytics")).toBe(false); });
});