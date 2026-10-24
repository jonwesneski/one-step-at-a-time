import type { TimeSignature } from '@one-step-at-a-time/web-components';
import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { ConnectorEntryAttributes } from './connectorsHelpers';
import { resolveConnectorAttributes } from './connectorsHelpers';
import type { OctaveEntryAttributes } from './octaveHelpers';
import { resolveOctaveAttributes } from './octaveHelpers';
import { effectiveTimeSignatures } from './timeSignaturesHelpers';
import type { CompositionFormValues, CompositionStructure } from './types';

// Assembles the normalized structural slice from the form store, reactively.
export function useCompositionStructure(): CompositionStructure {
  const { control } = useFormContext<CompositionFormValues>();
  const timeSig = useWatch({ control, name: 'timeSig' });
  const measureOrder = useWatch({ control, name: 'measureOrder' });
  const measuresById = useWatch({ control, name: 'measuresById' });
  const stavesById = useWatch({ control, name: 'stavesById' });
  const entriesById = useWatch({ control, name: 'entriesById' });
  const connectorsById = useWatch({ control, name: 'connectorsById' });
  const connectorOrder = useWatch({ control, name: 'connectorOrder' });
  const tupletsById = useWatch({ control, name: 'tupletsById' });
  const octaveSpansById = useWatch({ control, name: 'octaveSpansById' });

  return useMemo(
    () => ({
      timeSig,
      measureOrder,
      measuresById,
      stavesById,
      entriesById,
      connectorsById,
      connectorOrder,
      tupletsById,
      octaveSpansById,
    }),
    [
      timeSig,
      measureOrder,
      measuresById,
      stavesById,
      entriesById,
      connectorsById,
      connectorOrder,
      tupletsById,
      octaveSpansById,
    ]
  );
}

// Per-entry tie/slur/id/for attributes, keyed by entry id.
export function useConnectorAttributes(): Map<
  string,
  ConnectorEntryAttributes
> {
  const structure = useCompositionStructure();
  return useMemo(() => resolveConnectorAttributes(structure), [structure]);
}

// Per-entry octave-shift/-stop/loco attributes, keyed by entry id.
export function useOctaveAttributes(): Map<string, OctaveEntryAttributes> {
  const structure = useCompositionStructure();
  return useMemo(() => resolveOctaveAttributes(structure), [structure]);
}

// Effective time signature of every measure, keyed by measure id.
export function useMeasureTimeSignatures(): Map<string, TimeSignature> {
  const structure = useCompositionStructure();
  return useMemo(() => {
    const timeSignatures = effectiveTimeSignatures(structure);
    return new Map(
      structure.measureOrder.map((id, i) => [id, timeSignatures[i]])
    );
  }, [structure]);
}
