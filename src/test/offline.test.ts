import { describe, expect, it } from "vitest";
import { refuseOfflineRegistration } from "@/lib/offline";
import { parseFavorites, toggleFavorite } from "@/lib/favorites";
import { PORTS } from "@/lib/ports";
import { pwaOptions } from "../../pwa-options";
describe("Public offline cache rules", () => {
  it("uses network first and offline fallback only when navigation fails", () => {
    const pages = pwaOptions.workbox.runtimeCaching[0];
    expect(pwaOptions.workbox.navigateFallback).toBeNull();
    expect(pages?.handler).toBe("NetworkFirst");
    expect(pages?.options).toHaveProperty("precacheFallback.fallbackURL", "/offline.html");
  });
  it("limits visited tiles to 600 entries and 30 days", () => {
    expect(pwaOptions.workbox.runtimeCaching[1]?.options).toHaveProperty("expiration.maxEntries", 600);
    expect(pwaOptions.workbox.runtimeCaching[1]?.options).toHaveProperty("expiration.maxAgeSeconds", 2592000);
  });
});
describe("Offline registration safety", () => {
  it.each(["id-preview--test.lovable.app", "preview-v2--test.gpt-eng.com", "project--abc-dev.lovable.app", "beta.lovable.dev", "abc.lovableproject.com", "abc.lovableproject-dev.com"])("blocks built preview %s", host => expect(refuseOfflineRegistration(host, true, false, "")).toBe(true));
  it("blocks development", () => expect(refuseOfflineRegistration("localhost", false, false, "")).toBe(true));
  it("blocks an iframe", () => expect(refuseOfflineRegistration("example.com", true, true, "")).toBe(true));
  it("supports the sw off switch", () => expect(refuseOfflineRegistration("example.com", true, false, "?sw=off")).toBe(true));
  it("keeps published custom domains eligible", () => expect(refuseOfflineRegistration("preview-v2--shop.example.com", true, false, "")).toBe(false));
  it("blocks the delegated preview only", () => expect(refuseOfflineRegistration("preview.example.com", true, false, "", "preview.example.com")).toBe(true));
});
describe("Favorite offline snapshots", () => {
  it("keeps saved rates, depth and contacts after parsing storage", () => {
    const port = PORTS[0]; if (!port) throw new Error("Missing seed port");
    const saved = toggleFavorite([], { ...port, rateHigh: 91, depth: 4.2, phone: "+39 041 123456" }, "/assets/photo.jpg", "2026-11-22T23:22:00Z");
    const parsed = parseFavorites(JSON.stringify(saved));
    expect(parsed[0]?.port.rateHigh).toBe(91); expect(parsed[0]?.port.depth).toBe(4.2); expect(parsed[0]?.port.phone).toBe("+39 041 123456");
  });
  it("removes a favorite on a second tap", () => {
    const port = PORTS[0]; if (!port) throw new Error("Missing seed port");
    const first = toggleFavorite([], port, "/assets/photo.jpg", "2026-11-22T23:22:00Z");
    expect(toggleFavorite(first, port, "/assets/photo.jpg", "2026-11-22T23:23:00Z")).toEqual([]);
  });
  it("does not crash on damaged storage", () => { expect(parseFavorites("invalid")).toEqual([]); expect(parseFavorites('{"not":"a list"}')).toEqual([]); });
});