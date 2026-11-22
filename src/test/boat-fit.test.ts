import { describe, expect, it } from "vitest";
import { checkFit, getPort } from "@/lib/ports";
const lido = getPort("lido")!; // fondale 2.2, max 14 x 4.5
describe("adattabilità porto", () => {
  it("scarta se pescaggio + 0,5 m supera il fondale", () => { expect(checkFit(lido, { length: 10, beam: 3, draft: 1.8 }).ok).toBe(false); });
  it("accetta se rientra in fondale e dimensioni", () => { expect(checkFit(lido, { length: 10, beam: 3, draft: 1.5 }).ok).toBe(true); });
  it("scarta se troppo lunga", () => { expect(checkFit(lido, { length: 15, beam: 3, draft: 1 }).ok).toBe(false); });
});
