import { afterEach, describe, expect, it, vi } from "vitest";
import { moveWaypoint, waypointGesture } from "@/lib/waypoint-edit";
import { routeSchedule } from "@/lib/route-timing";

afterEach(() => vi.useRealTimers());
describe("waypoint press and drag", () => {
  it("attaches at exactly 0.5 seconds, not earlier", () => {
    vi.useFakeTimers(); const activate = vi.fn();
    const g = waypointGesture(activate, vi.fn(), vi.fn());
    g.start(10, 20); vi.advanceTimersByTime(499); expect(activate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(activate).toHaveBeenCalledOnce();
  });
  it("moves after attachment and commits once on release", () => {
    vi.useFakeTimers(); const move = vi.fn(), commit = vi.fn();
    const g = waypointGesture(vi.fn(), move, commit);
    g.start(10, 20); g.move(12, 21); expect(move).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500); g.move(90, 100); expect(move).toHaveBeenCalledWith(90, 100);
    g.end(); g.end(); expect(commit).toHaveBeenCalledOnce();
  });
  it("does not edit on short taps, early drags or pointer cancellation", () => {
    vi.useFakeTimers(); const activate = vi.fn(), commit = vi.fn();
    const g = waypointGesture(activate, vi.fn(), commit);
    g.start(0, 0); vi.advanceTimersByTime(499); g.end();
    g.start(0, 0); g.move(20, 0); vi.advanceTimersByTime(500);
    expect(activate).not.toHaveBeenCalled();
    g.start(0, 0); vi.advanceTimersByTime(500); g.cancel(); g.end(); expect(commit).not.toHaveBeenCalled();
  });
});
describe("edited route", () => {
  const points = [{ lat: 45, lon: 13 }, { lat: 45, lon: 13.2 }, { lat: 45, lon: 13.4 }];
  it("replaces only the moved waypoint and recalculates distance and ETA", () => {
    const moved = { lat: 45.2, lon: 13.2 };
    const r = moveWaypoint(points, undefined, 1, moved);
    expect(r?.points).toEqual([points[0], moved, points[2]]);
    const before = routeSchedule(points, 0, 6).at(-1);
    const after = routeSchedule(r?.points ?? [], 0, 6).at(-1);
    expect(after?.distanceNm ?? 0).toBeGreaterThan(before?.distanceNm ?? Infinity);
    expect(after?.arrival ?? 0).toBeGreaterThan(before?.arrival ?? Infinity);
    expect(points[1]).toEqual({ lat: 45, lon: 13.2 });
  });
  it("keeps the departure channel and other track vertices", () => {
    const prefix = { lat: 44.95, lon: 12.95 }, suffix = { lat: 45.01, lon: 13.41 };
    const moved = { lat: 45.1, lon: 13.2 };
    const r = moveWaypoint(points, [prefix, ...points, suffix], 1, moved);
    expect(r?.track).toEqual([prefix, points[0], moved, points[2], suffix]);
  });
  it("rejects a waypoint dropped on the mainland", () => {
    expect(moveWaypoint(points, undefined, 1, { lat: 46, lon: 12 })).toBeNull();
  });
});