import { createFileRoute } from '@tanstack/react-router';
import { ClientOnly } from '../components/ClientOnly';
import StandAlone from '../components/StandAlone';

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
