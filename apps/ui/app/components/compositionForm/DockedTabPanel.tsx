import { ScrollArea } from '@/design-system';
import { createPortal } from 'react-dom';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { MARQUEE_IGNORE_ATTRIBUTE } from './marqueeHelpers';

interface DockedTabPanelTab {
  label: string;
  content: React.ReactNode;
}

interface DockedTabPanelProps {
  tabs: DockedTabPanelTab[];
}

export function DockedTabPanel({ tabs }: DockedTabPanelProps) {
  const { session, setSession } = useCompositionFormSession();

  const activeLabel = tabs.some((t) => t.label === session.entryPanelTab)
    ? session.entryPanelTab
    : tabs[0].label;
  const activeTab = tabs.find((t) => t.label === activeLabel) ?? tabs[0];

  // Portaled to <body>: rendered in place, a selected ancestor's
  // `.rainbow-selected { isolation: isolate }` traps the panel's z-index and
  // later score content (e.g. the disabled "Add Measure" button) paints over it.
  // React events still bubble through the React tree, so the click
  // stopPropagation and the marquee-ignore check behave as before.
  return createPortal(
    <div
      className="fixed bottom-0 left-0 w-full h-[25vh] md:h-auto md:max-h-[40vh] z-20 bg-surface shadow-lg border-t border-line flex flex-col"
      onClick={(e) => e.stopPropagation()}
      {...{ [MARQUEE_IGNORE_ATTRIBUTE]: '' }}
    >
      <ScrollArea
        axis="x"
        className="shrink-0 border-b border-line"
        contentClassName="flex"
      >
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm cursor-pointer bg-transparent border-0 ${
              t.label === activeTab.label
                ? 'border-b-2 border-accent text-accent font-medium'
                : 'text-fg-muted hover:text-fg'
            }`}
            onClick={() => setSession({ entryPanelTab: t.label })}
          >
            {t.label}
          </button>
        ))}
      </ScrollArea>
      <ScrollArea axis="y" className="flex-1 min-h-0">
        {activeTab.content}
      </ScrollArea>
    </div>,
    document.body
  );
}
