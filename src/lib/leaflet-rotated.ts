// Dependency evaluation order is intentional: initialize the global first.
import L from "./leaflet-global";
import "leaflet-rotate";

// Leaflet 1.9 leaves a debounced wheel callback alive when disabling/removing
// a map. Cancel it before panes disappear, including during preview remounts.
type WheelHandler = L.Handler & {
  _timer?: ReturnType<typeof setTimeout>;
  _delta: number;
  _startTime: number | null;
  removeHooks: () => void;
};

L.Map.addInitHook(function (this: L.Map) {
  const wheel = this.scrollWheelZoom as WheelHandler;
  const removeHooks = wheel.removeHooks;
  wheel.removeHooks = function () {
    clearTimeout(this._timer);
    this._delta = 0;
    this._startTime = null;
    removeHooks.call(this);
  };
  // leaflet-rotate creates ShiftKeyRotate outside Leaflet's handler registry.
  // Without explicit disposal its wheel listener re-enables a destroyed map's
  // scroll handler when React reuses the container for a new map.
  const rotatedMap = this as L.Map & { shiftKeyRotate?: L.Handler };
  this.on("unload", () => {
    rotatedMap.shiftKeyRotate?.disable();
    wheel.disable();
  });
});

export default L;