import { createContext, useContext, useState } from 'react';

export type CompositionFormSession = {
  tab: 'note' | 'chord';
};

const CompositionFormSessionContext = createContext<{
  session: CompositionFormSession;
  setSession: (patch: Partial<CompositionFormSession>) => void;
} | null>(null);

// For state that is shared across the composition form, but NOT submitted
export function CompositionFormSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSessionState] = useState<CompositionFormSession>({
    tab: 'note',
  });
  const setSession = (patch: Partial<CompositionFormSession>) =>
    setSessionState((prev) => ({ ...prev, ...patch }));
  return (
    <CompositionFormSessionContext value={{ session, setSession }}>
      {children}
    </CompositionFormSessionContext>
  );
}

export function useCompositionFormSession() {
  const ctx = useContext(CompositionFormSessionContext);
  if (!ctx)
    throw new Error(
      `${useCompositionFormSession.name} must be used within ${CompositionFormSessionProvider.name}`
    );
  return ctx;
}
