import { useCompositionFormSession } from './CompositionFormSessionContext';

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

  return (
    <div
      className="fixed bottom-0 left-0 w-full h-[25vh] md:h-auto md:max-h-[40vh] z-20 bg-white shadow-lg border-t border-zinc-200 flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex shrink-0 overflow-x-auto border-b border-zinc-200">
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm cursor-pointer bg-transparent border-0 ${
              t.label === activeTab.label
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
            onClick={() => setSession({ entryPanelTab: t.label })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{activeTab.content}</div>
    </div>
  );
}
