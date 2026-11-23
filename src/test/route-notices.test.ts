import { describe, expect, it } from "vitest";
import { matchNotice } from "@/lib/route-notices";
import { parseCoords, parseHhi } from "@/lib/hhi";

const route = [{ lat: 45.0, lon: 13.0 }, { lat: 45.0, lon: 13.5 }];
const t0 = Date.parse("2026-11-23T08:00:00Z"), t1 = Date.parse("2026-11-23T14:00:00Z");
const base = { id: "a", lat: 45.0, lon: 13.25, radius_km: 1, valid_until: "2026-11-30T00:00:00Z" };

describe("avvisi lungo la rotta", () => {
  it("un'area attraversata dalla rotta è sulla rotta", () => expect(matchNotice(base, route, t0, t1)?.kind).toBe("sulla-rotta"));
  it("entro 2 Mn dal percorso è vicino", () => expect(matchNotice({ ...base, lat: 45.03 }, route, t0, t1)?.kind).toBe("vicino"));
  it("lontano dal percorso viene escluso", () => expect(matchNotice({ ...base, lat: 45.3 }, route, t0, t1)).toBeNull());
  it("scaduto prima della partenza viene escluso", () => expect(matchNotice({ ...base, valid_until: "2026-11-22T00:00:00Z" }, route, t0, t1)).toBeNull());
  it("che inizia dopo l'arrivo viene escluso", () => expect(matchNotice({ ...base, valid_from: "2026-11-24T00:00:00Z" }, route, t0, t1)).toBeNull());
  it("un avviso di zona ampio non è un divieto sulla rotta", () => expect(matchNotice({ ...base, radius_km: 40 }, route, t0, t1)?.kind).toBe("zona"));
  it("un avviso revocato viene escluso", () => expect(matchNotice({ ...base, status: "revocato" }, route, t0, t1)).toBeNull());
});

describe("radioavvisi HHI", () => {
  it("converte le coordinate gradi-minuti", () => {
    const [p] = parseCoords("NA 43-00,65N 017-23,50E (WGS84)");
    expect(p?.[0]).toBeCloseTo(43.0108, 3); expect(p?.[1]).toBeCloseTo(17.3917, 3);
  });
  it("legge numero, regione, data e testo", () => {
    const html = `<tr class="c-table__row"><h4 class="o-item-id">429</h4><p class="o-item-yr">2026.</p><div><span class="label">Kategorija:</span>LOKALNO - LOCAL</div><span class="o-value__region">SJEVERNI JADRAN</span><div><span class="label">Datum objave:</span>19. 11. 2026.</div><main class="c-content__main"><p>REGATA PIRAN &#59; SAVUDRIJA.</p></main></tr>`;
    const [i] = parseHhi(html);
    expect(i?.key).toBe("hhi:2026:429"); expect(i?.region).toBe("SJEVERNI JADRAN"); expect(i?.published).toBe("2026-11-19"); expect(i?.lat).toBeNull();
  });
});
