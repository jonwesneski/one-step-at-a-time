import { useEffect, useRef, useState } from 'react';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { DRAG_THRESHOLD_PX } from './entryDragHelpers';
import {
  LONG_PRESS_JITTER_PX,
  LONG_PRESS_MS,
  autoScrollDelta,
  pageToClientRect,
  rectFromPoints,
  shouldArmMarquee,
  type Point,
} from './marqueeHelpers';

type Gesture = {
  pointerId: number;
  pointerType: string;
  // Page coordinates, so the anchor stays on the same spot of the score when
  // the page scrolls mid-drag.
  start: Point;
  startClient: Point;
  lastClient: Point;
  isDragging: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
};

function scrollOffset(): Point {
  return { x: window.scrollX, y: window.scrollY };
}

function clientRectOf(gesture: Gesture): DOMRect {
  const scroll = scrollOffset();
  const end = {
    x: gesture.lastClient.x + scroll.x,
    y: gesture.lastClient.y + scroll.y,
  };
  return pageToClientRect(rectFromPoints(gesture.start, end), scroll);
}

function isAdditive(e: React.PointerEvent): boolean {
  return e.shiftKey || e.metaKey || e.ctrlKey;
}

export function useMarqueeSelection() {
  const { applyDragSelection } = useCompositionFormSession();
  const gestureRef = useRef<Gesture | null>(null);
  const justCompletedDragRef = useRef(false);
  const [marqueeRect, setMarqueeRect] = useState<DOMRect | null>(null);
  const isDragging = marqueeRect !== null;

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const refresh = () => {
      const gesture = gestureRef.current;
      if (gesture?.isDragging) {
        setMarqueeRect(clientRectOf(gesture));
      }
    };
    let frame = requestAnimationFrame(function tick() {
      const gesture = gestureRef.current;
      if (gesture) {
        const dy = autoScrollDelta(gesture.lastClient.y, window.innerHeight);
        if (dy !== 0) {
          window.scrollBy(0, dy);
        }
      }
      frame = requestAnimationFrame(tick);
    });
    window.addEventListener('scroll', refresh, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', refresh);
    };
  }, [isDragging]);

  useEffect(
    () => () => {
      const timer = gestureRef.current?.longPressTimer;
      if (timer) {
        clearTimeout(timer);
      }
    },
    []
  );

  function endGesture() {
    const timer = gestureRef.current?.longPressTimer;
    if (timer) {
      clearTimeout(timer);
    }
    gestureRef.current = null;
    setMarqueeRect(null);
  }

  function beginDrag(gesture: Gesture, target: HTMLElement) {
    gesture.isDragging = true;
    gesture.longPressTimer = null;
    target.setPointerCapture(gesture.pointerId);
    setMarqueeRect(clientRectOf(gesture));
  }

  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    justCompletedDragRef.current = false;
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }
    if (!shouldArmMarquee(e.target)) {
      return;
    }
    const client = { x: e.clientX, y: e.clientY };
    const scroll = scrollOffset();
    const gesture: Gesture = {
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      start: { x: client.x + scroll.x, y: client.y + scroll.y },
      startClient: client,
      lastClient: client,
      isDragging: false,
      longPressTimer: null,
    };
    if (e.pointerType === 'touch') {
      // A plain swipe must still scroll the page, so touch only engages after
      // the finger has been held roughly still for LONG_PRESS_MS.
      const target = e.currentTarget;
      gesture.longPressTimer = setTimeout(() => {
        if (gestureRef.current === gesture) {
          beginDrag(gesture, target);
        }
      }, LONG_PRESS_MS);
    }
    gestureRef.current = gesture;
  }

  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) {
      return;
    }
    gesture.lastClient = { x: e.clientX, y: e.clientY };
    const distance = Math.hypot(
      e.clientX - gesture.startClient.x,
      e.clientY - gesture.startClient.y
    );

    if (gesture.pointerType === 'touch' && !gesture.isDragging) {
      if (distance > LONG_PRESS_JITTER_PX) {
        endGesture();
      }
      return;
    }

    if (!gesture.isDragging) {
      if (distance < DRAG_THRESHOLD_PX) {
        return;
      }
      // Capture is deferred to here: capturing on pointerdown would retarget
      // a plain click to the canvas and break descendants' onClick.
      beginDrag(gesture, e.currentTarget);
      return;
    }

    e.preventDefault();
    setMarqueeRect(clientRectOf(gesture));
  }

  function onPointerUp(e: React.PointerEvent<HTMLElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId) {
      return;
    }
    if (gesture.isDragging) {
      gesture.lastClient = { x: e.clientX, y: e.clientY };
      applyDragSelection(clientRectOf(gesture), { additive: isAdditive(e) });
      justCompletedDragRef.current = true;
    }
    endGesture();
  }

  function onClickCapture(e: React.MouseEvent) {
    if (justCompletedDragRef.current) {
      e.stopPropagation();
      justCompletedDragRef.current = false;
    }
  }

  return {
    marqueeRect,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: endGesture,
      onClickCapture,
    },
  };
}
