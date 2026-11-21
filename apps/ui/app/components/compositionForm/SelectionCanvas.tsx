import { useCompositionFormSession } from './CompositionFormSessionContext';
import { useMarqueeSelection } from './useMarqueeSelection';

// Clicks in the gaps of `<music-composition>`'s shadow DOM retarget to the
// host, so it counts as empty canvas too.
function isEmptyCanvasTarget(target: EventTarget, canvas: EventTarget) {
  return (
    target === canvas ||
    (target instanceof Element && target.localName === 'music-composition')
  );
}

export function SelectionCanvas({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { clearSelection } = useCompositionFormSession();
  const { marqueeRect, handlers } = useMarqueeSelection();

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (isEmptyCanvasTarget(e.target, e.currentTarget)) {
      clearSelection();
    }
  }

  return (
    <div
      className={`relative flex-1 select-none rounded border border-zinc-200 bg-white p-6 shadow-sm ${
        className ?? ''
      }`}
      {...handlers}
      onClick={handleClick}
    >
      {children}
      {marqueeRect && (
        <div
          className="fixed pointer-events-none z-50 border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: marqueeRect.left,
            top: marqueeRect.top,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
    </div>
  );
}
