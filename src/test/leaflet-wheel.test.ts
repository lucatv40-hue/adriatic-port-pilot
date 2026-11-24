import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import L from "@/lib/leaflet-rotated";

describe("Leaflet wheel zoom lifecycle", () => {
  let container: HTMLDivElement;
  let map: L.Map;
  const originalSvg = L.Browser.svg;

  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom does not expose SVGSVGElement.createSVGRect for Leaflet's detection.
    Object.defineProperty(L.Browser, "svg", { value: true, configurable: true });
    container = document.createElement("div");
    document.body.append(container);
    map = L.map(container, { rotate: true, touchRotate: true, zoomAnimation: false }).setView([45.25, 13.1], 8);
  });

  afterEach(() => {
    if (container.isConnected) {
      map.remove();
      container.remove();
    }
    vi.useRealTimers();
    Object.defineProperty(L.Browser, "svg", { value: originalSvg, configurable: true });
  });

  function wheel() {
    container.dispatchEvent(new WheelEvent("wheel", { deltaY: -120, clientX: 100, clientY: 100, bubbles: true, cancelable: true }));
  }

  it("cancels a pending wheel zoom when the map is removed", () => {
    wheel();
    map.remove();
    container.remove();
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
  });

  it("does not zoom after the wheel handler is disabled", () => {
    wheel();
    map.scrollWheelZoom.disable();
    vi.advanceTimersByTime(100);
    expect(map.getZoom()).toBe(8);
  });

  it("removes the rotation wheel listener when the same container is reused", () => {
    map.remove();
    map = L.map(container, { rotate: true, touchRotate: true, zoomAnimation: false }).setView([45.25, 13.1], 8);
    wheel();
    expect(() => vi.advanceTimersByTime(100)).not.toThrow();
    expect(map.getZoom()).toBeGreaterThan(8);
  });

  it("still zooms after re-enabling, with a route drawn", () => {
    L.polyline([[45.25, 13.1], [45.65, 13.75]]).addTo(map);
    wheel();
    map.scrollWheelZoom.disable();
    map.scrollWheelZoom.enable();
    wheel();
    vi.advanceTimersByTime(100);
    expect(map.getZoom()).toBeGreaterThan(8);
  });
});