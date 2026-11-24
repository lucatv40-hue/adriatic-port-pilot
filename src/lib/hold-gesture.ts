export const HOLD_MS = 700;

/** Cancel an unarmed hold when it becomes a scroll or a drag. */
export function holdGesture(onActivate: (x: number) => void, onMove: (x: number) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let origin: { x: number; y: number } | null = null;
  let active = false;
  let activated = false;
  const end = () => { clearTimeout(timer); timer = undefined; origin = null; active = false; };
  return {
    start(x: number, y: number) {
      end(); activated = false; origin = { x, y };
      timer = setTimeout(() => { active = true; activated = true; onActivate(x); }, HOLD_MS);
    },
    move(x: number, y: number) {
      if (active) onMove(x);
      else if (origin && Math.hypot(x - origin.x, y - origin.y) > 8) end();
    },
    end,
    activated: () => activated,
  };
}