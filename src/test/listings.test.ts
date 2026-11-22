import { describe, it, expect } from "vitest";
import { applyListing, priceFor, type Listing } from "@/lib/listings";
import { PORTS } from "@/lib/ports";

const base = PORTS[0]!;
const l = (status: Listing["status"]): Listing => ({ id: "x", owner_id: "u", port_id: base.id, kind: "porto", name: "", town: "", status, request_note: "", photos: [], availability: "alta", phone: "+39 1", email: "a@b.it", website: "", description: "",
  rates: [{ season: "bassa", minLen: 10, maxLen: 14, price: 33 }, { season: "alta", minLen: 10, maxLen: 14, price: 77 }, { season: "alta", minLen: 15, maxLen: 20, price: 120 }] });

describe("schede gestore", () => {
  it("solo le schede approvate sono verificate", () => {
    expect(applyListing(base, l("pending")).verified).toBe(false);
    expect(applyListing(base, l("approved")).verified).toBe(true);
  });
  it("la scheda approvata sostituisce tariffe e contatti", () => {
    const p = applyListing(base, l("approved"));
    expect([p.rateLow, p.rateHigh, p.phone]).toEqual([33, 77, "+39 1"]);
  });
  it("prezzo per stagione e lunghezza", () => {
    expect(priceFor(l("approved").rates, "alta", 18)).toBe(120);
    expect(priceFor(l("approved").rates, "media", 12)).toBeNull();
  });
});
