import { Button } from '@/design-system';
import type { PendingTimeSignatureChange } from './CompositionFormSessionContext';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { remainingDuration } from './measureCapacityHelpers';
import { effectiveTimeSignatures } from './timeSignaturesHelpers';
import type { CompositionStructure } from './types';
import { useCompositionStructure } from './useCompositionStructure';
import { staffEntryIds } from './voiceHelpers';

// The Sibelius-style prompt shown after the user picks a new time signature:
// rewrite the music to fit, apply the signature only, or cancel. Rendered by
// CompositionFormBody off `session.pendingTimeSignatureChange`.
export function TimeSignatureChangeDialog() {
  const { session, confirmTimeSignatureChange, cancelTimeSignatureChange } =
    useCompositionFormSession();
  const structure = useCompositionStructure();
  const pending = session.pendingTimeSignatureChange;

  if (!pending) {
    return null;
  }

  const target =
    pending.scope === 'measure' && pending.timeSig === null
      ? 'the previous measure’s time signature'
      : `${pending.timeSig}`;
  const overflow = signatureOnlyOverflowCount(structure, pending);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={cancelTimeSignatureChange}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medium text-zinc-800">Change to {target}?</h2>
        <p className="text-sm text-zinc-600">
          Rewrite the music to fit — notes that cross a new barline are split
          and tied, and measures are added or removed as needed — or just change
          the signature and leave the notes where they are.
        </p>
        {overflow > 0 && (
          <p className="text-sm text-red-600">
            “Change signature only” will leave {overflow}{' '}
            {overflow === 1 ? 'measure' : 'measures'} with more notes than fit.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => confirmTimeSignatureChange(true)}
          >
            Rewrite the music
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => confirmTimeSignatureChange(false)}
          >
            Change signature only
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={cancelTimeSignatureChange}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function signatureOnlyOverflowCount(
  structure: CompositionStructure,
  pending: PendingTimeSignatureChange
): number {
  const next: CompositionStructure =
    pending.scope === 'composition'
      ? { ...structure, timeSig: pending.timeSig }
      : {
          ...structure,
          measuresById: {
            ...structure.measuresById,
            [pending.measureId]: {
              ...structure.measuresById[pending.measureId],
              time: pending.timeSig,
            },
          },
        };
  const timeSignatures = effectiveTimeSignatures(next);
  return next.measureOrder.reduce((count, id, index) => {
    const measure = next.measuresById[id];
    const overfull = measure.staffIds.some((sid) => {
      const staff = next.stavesById[sid];
      return (
        staff !== undefined &&
        remainingDuration(
          staffEntryIds(staff).map((eid) => next.entriesById[eid]),
          timeSignatures[index],
          next.tupletsById
        ) < -1e-9
      );
    });
    return overfull ? count + 1 : count;
  }, 0);
}
