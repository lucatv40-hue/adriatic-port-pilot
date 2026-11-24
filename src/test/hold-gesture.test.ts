import { afterEach, describe, expect, it, vi } from "vitest";
import { holdGesture } from "@/lib/hold-gesture";

afterEach(() => vi.useRealTimers());
describe("pressione protetta", () => {
  it("si attiva a 0,7 secondi, mai prima", () => {
    vi.useFakeTimers(); const activate = vi.fn();
    const hold = holdGesture(activate, vi.fn()); hold.start(10, 20);
    vi.advanceTimersByTime(699); expect(activate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(activate).toHaveBeenCalledWith(10); hold.end();
  });
  it("tap e passaggio del mouse non spostano l'orario", () => {
    vi.useFakeTimers(); const activate = vi.fn(), move = vi.fn();
    const hold = holdGesture(activate, move); hold.move(100, 20);
    hold.start(10, 20); vi.advanceTimersByTime(100); hold.end();
    vi.advanceTimersByTime(700); expect(activate).not.toHaveBeenCalled(); expect(move).not.toHaveBeenCalled();
  });
  it("scorrere prima dei 700 ms annulla la selezione", () => {
    vi.useFakeTimers(); const activate = vi.fn(); const hold = holdGesture(activate, vi.fn());
    hold.start(10, 20); hold.move(10, 40); vi.advanceTimersByTime(700);
    expect(activate).not.toHaveBeenCalled();
  });
  it("trascina solo dopo l'attivazione e si ferma al rilascio", () => {
    vi.useFakeTimers(); const move = vi.fn(); const hold = holdGesture(vi.fn(), move);
    hold.start(10, 20); vi.advanceTimersByTime(700); hold.move(60, 20);
    expect(move).toHaveBeenCalledWith(60); hold.end(); hold.move(80, 20);
    expect(move).toHaveBeenCalledTimes(1); expect(hold.activated()).toBe(true);
    hold.start(10, 20); expect(hold.activated()).toBe(false); hold.end();
  });
});