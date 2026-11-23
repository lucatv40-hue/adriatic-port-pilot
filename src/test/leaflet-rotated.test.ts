import { describe, expect, it } from "vitest";

describe("Leaflet rotation initialization", () => {
  it("loads without a pre-existing global and rotates the shared map instance", async () => {
    Reflect.deleteProperty(globalThis, "L");
    const { default: L } = await import("@/lib/leaflet-rotated");
    expect(Reflect.get(globalThis, "L")).toBe(L);
    expect(L.version).toBe("1.9.4");

    const container = document.createElement("div");
    document.body.append(container);
    const map = L.map(container, { rotate: true, touchRotate: true, rotateControl: false });
    try {
      map.setView([45.3, 13.1], 8);
      map.setBearing(45);
      expect(map.getBearing()).toBe(45);
      const marker = L.marker([45.3, 13.1], { rotateWithView: true }).addTo(map);
      expect(marker.getElement()).toBeDefined();
      expect(marker.options.rotateWithView).toBe(true);
    } finally {
      map.remove();
      container.remove();
    }
  });
});