import { useEffect, useRef, useState } from 'react';

type ScrollAreaProps = {
  axis: 'x' | 'y';
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

// The 1px slack absorbs sub-pixel scroll positions on zoomed/high-DPI screens.
function hasMoreToScroll(el: HTMLElement, axis: 'x' | 'y'): boolean {
  return axis === 'y'
    ? el.scrollTop + el.clientHeight < el.scrollHeight - 1
    : el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
}

const AXIS_CLASSES = {
  y: {
    outer: 'flex flex-col',
    scroller: 'min-h-0 flex-1 overflow-y-auto',
    content: '',
    fade: 'inset-x-0 bottom-0 h-8 bg-linear-to-t',
  },
  x: {
    outer: '',
    scroller: 'overflow-x-auto',
    content: 'w-max',
    fade: 'inset-y-0 right-0 w-8 bg-linear-to-l',
  },
} as const;

// A scroll container that fades out its end edge while there's more to scroll.
export function ScrollArea({
  axis,
  className,
  contentClassName,
  children,
}: ScrollAreaProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const classes = AXIS_CLASSES[axis];

  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) {
      return;
    }
    const update = () => setHasMore(hasMoreToScroll(scroller, axis));
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(content);
    return () => {
      scroller.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [axis]);

  return (
    <div className={`relative ${classes.outer} ${className ?? ''}`}>
      <div ref={scrollerRef} className={classes.scroller}>
        <div
          ref={contentRef}
          className={`${classes.content} ${contentClassName ?? ''}`}
        >
          {children}
        </div>
      </div>
      <div
        className={`pointer-events-none absolute from-surface to-transparent transition-opacity duration-200 ${
          classes.fade
        } ${hasMore ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
