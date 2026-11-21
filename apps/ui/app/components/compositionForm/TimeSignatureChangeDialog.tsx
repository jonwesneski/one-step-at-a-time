import { Button } from '@/design-system';
import type { PendingTimeSignatureChange } from './CompositionFormSessionContext';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { remainingDuration } from './measureCapacityHelpers';
import { REBAR_REPEATS_REASON } from './rebarHelpers';
import { rebarWouldDropRepeats } from './repeatsHelpers';
import {
  effectiveTimeSignatures,
  timeSignatureRegionAt,
} from './timeSignaturesHelpers';
import type { CompositionStructure } from './types';
import { useCompositionStructure } from './useCompositionStructure';

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
  const rewriteBlocked = rewriteWouldDropRepeats(structure, pending);
  const movesLyrics = rewriteMovesLyrics(structure, pending);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      onClick={cancelTimeSignatureChange}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medium text-fg">Change to {target}?</h2>
        <p className="text-sm text-fg-muted">
          Rewrite the music to fit — notes that cross a new barline are split
          and tied, and measures are added or removed as needed — or just change
          the signature and leave the notes where they are.
        </p>
        {overflow > 0 && (
          <p className="text-sm text-danger">
            “Change signature only” will leave {overflow}{' '}
            {overflow === 1 ? 'measure' : 'measures'} with more notes than fit.
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            disabled={rewriteBlocked}
            onClick={() => confirmTimeSignatureChange(true)}
          >
            Rewrite the music
          </Button>
          {rewriteBlocked && (
            <p className="text-xs text-fg-muted">{REBAR_REPEATS_REASON}</p>
          )}
          {!rewriteBlocked && movesLyrics && (
            <p className="text-xs text-fg-muted">
              Rewriting gathers this passage’s lyrics onto its first bar; move
              them back afterwards.
            </p>
          )}
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

function withPendingTimeSignature(
  structure: CompositionStructure,
  pending: PendingTimeSignatureChange
): CompositionStructure {
  return pending.scope === 'composition'
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
}

// The measures rebar() would rewrite for this change.
function rewriteRegion(
  structure: CompositionStructure,
  pending: PendingTimeSignatureChange
) {
  const next = withPendingTimeSignature(structure, pending);
  const index =
    pending.scope === 'composition'
      ? 0
      : Math.max(0, next.measureOrder.indexOf(pending.measureId));
  return { next, ...timeSignatureRegionAt(next, index) };
}

export function rewriteWouldDropRepeats(
  structure: CompositionStructure,
  pending: PendingTimeSignatureChange
): boolean {
  const { next, startIndex, endIndex } = rewriteRegion(structure, pending);
  return rebarWouldDropRepeats(next, startIndex, endIndex);
}

// Lyrics after the region's first bar, which a rewrite moves onto it.
export function rewriteMovesLyrics(
  structure: CompositionStructure,
  pending: PendingTimeSignatureChange
): boolean {
  const { next, startIndex, endIndex } = rewriteRegion(structure, pending);
  return next.measureOrder.slice(startIndex + 1, endIndex).some((id) =>
    next.measuresById[id]?.staffIds.some((staffId) => {
      const staff = next.stavesById[staffId];
      return staff?.type === 'vocal' && (staff.lyrics?.length ?? 0) > 0;
    })
  );
}

export function signatureOnlyOverflowCount(
  structure: CompositionStructure,
  pending: PendingTimeSignatureChange
): number {
  const next = withPendingTimeSignature(structure, pending);
  const timeSignatures = effectiveTimeSignatures(next);
  return next.measureOrder.reduce((count, id, index) => {
    const measure = next.measuresById[id];
    const overfull = measure.staffIds.some((sid) => {
      const staff = next.stavesById[sid];
      // Checked per voice, not per staff — each voice has its own
      // independent capacity budget (see measureCapacityHelpers.ts and
      // MeasureInput's matching check), so summing across voices before
      // comparing would wrongly flag a staff whose voices each
      // individually fit.
      return (
        staff?.voiceOrder.some(
          (voiceId) =>
            remainingDuration(
              staff.voicesById[voiceId].entryIds.map(
                (eid) => next.entriesById[eid]
              ),
              timeSignatures[index],
              next
            ) < -1e-9
        ) ?? false
      );
    });
    return overfull ? count + 1 : count;
  }, 0);
}
