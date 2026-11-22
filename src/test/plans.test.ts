import { describe, it, expect } from "vitest";
import { access, PLANS, FLEET_SEATS, TRIAL_DAYS } from "@/lib/plans";

describe("piani", () => {
  it("gratuito non sblocca niente", () => expect(access([])).toEqual({ skipper: false, gestore: false, flotta: false }));
  it("skipper sblocca le funzioni skipper", () => expect(access(["skipper_monthly"]).skipper).toBe(true));
  it("flotta include skipper, anche per i membri", () => {
    expect(access(["flotta_monthly"]).skipper).toBe(true);
    expect(access(["flotta_member"]).skipper).toBe(true);
    expect(access(["flotta_member"]).flotta).toBe(false);
  });
  it("gestore non include skipper", () => expect(access(["gestore_monthly"])).toEqual({ skipper: false, gestore: true, flotta: false }));
  it("prezzi e limiti", () => {
    expect(PLANS.map((p) => p.price)).toEqual(["0 €", "4,99 €/mese", "19,99 €/mese", "39 €/mese"]);
    expect(FLEET_SEATS).toBe(10);
    expect(TRIAL_DAYS).toBe(14);
  });
});
