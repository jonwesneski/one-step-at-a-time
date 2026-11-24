import { ClientOnly } from '@/components/ClientOnly';
import StandAlone from '@/components/StandAlone';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/standalone')({
  component: StandalonePage,
});

function StandalonePage() {
  return (
    <ClientOnly>
      <StandAlone />
    </ClientOnly>
  );
}
