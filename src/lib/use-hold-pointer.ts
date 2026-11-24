import { useEffect, useMemo, useRef, type PointerEvent } from "react";
import { holdGesture } from "@/lib/hold-gesture";

export function useHoldPointer<T extends Element>(onHold: (x: number, element: T) => void, onDrag?: (x: number, element: T) => void) {
  const callbacks = useRef({ onHold, onDrag }); callbacks.current = { onHold, onDrag };
  const element = useRef<T | null>(null);
  const pointer = useRef<number | null>(null);
  const gesture = useMemo(() => holdGesture(
    x => { if (element.current) callbacks.current.onHold(x, element.current); },
    x => { if (element.current) callbacks.current.onDrag?.(x, element.current); },
  ), []);
  useEffect(() => () => gesture.end(), [gesture]);
  const end = () => { gesture.end(); pointer.current = null; };
  return {
    activated: gesture.activated,
    handlers: {
      onPointerDown: (event: PointerEvent<T>) => {
        if (!event.isPrimary || event.button !== 0) return;
        element.current = event.currentTarget; pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.start(event.clientX, event.clientY);
      },
      onPointerMove: (event: PointerEvent<T>) => { if (pointer.current === event.pointerId) gesture.move(event.clientX, event.clientY); },
      onPointerUp: end,
      onPointerCancel: end,
      onLostPointerCapture: end,
      onContextMenu: (event: React.SyntheticEvent<T>) => event.preventDefault(),
    },
  };
}