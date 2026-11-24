import { describe, expect, it } from "vitest";
import { BAYS, baysNear, shelterLevel, sheltered } from "@/lib/bays";
const muggia = BAYS.find((b) => b.id === "muggia")!;
describe("baie riparate", () => {
  it("bora da NE espone Muggia", () => expect(shelterLevel(muggia, [{ wind: 25, gust: 35, dir: 60 }]).level).toBe("esposta"));
  it("scirocco da SE: Muggia riparata", () => expect(shelterLevel(muggia, [{ wind: 15, gust: 20, dir: 135 }]).level).toBe("riparata"));
  it("vento sotto 8 kn è calma", () => expect(shelterLevel(muggia, [{ wind: 5, gust: 7, dir: 60 }]).level).toBe("calma"));
  it("dati mancanti: non disponibile", () => expect(shelterLevel(muggia, [{ wind: null, gust: null, dir: null }]).level).toBe("non-disponibile"));
  it("settore a cavallo del nord", () => expect(sheltered(BAYS.find((b) => b.id === "sistiana")!, 350)).toBe(true));
  it("baie entro 15 Mn da Trieste", () => expect(baysNear({ lat: 45.65, lon: 13.76 }).map((x) => x.bay.id)).toContain("muggia"));
});
