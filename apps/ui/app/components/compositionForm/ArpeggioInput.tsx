import type {
  ArpeggioType,
  ConnectorRole,
  DynamicMarking,
  HairpinKind,
} from '@one-step-at-a-time/web-components';
import { ARPEGGIOS, DYNAMICS } from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OptionalSelect } from './entryControls';
import { isRolledArpeggio } from './markingsHelpers';
import type { ChordEntry, NoteEntry } from './types';

const HAIRPIN_KINDS: HairpinKind[] = ['crescendo', 'decrescendo'];
const ARPEGGIATE_ROLES: ConnectorRole[] = ['start', 'end'];

// The arpeggio sign beside one note/chord, and the "sempre arpeggiando"
// passage markers. A written-out arpeggio (the run of notes) is a separate,
// multi-entry feature.
export function ArpeggioInput({ entry }: { entry: NoteEntry | ChordEntry }) {
  const { updateEntry } = useCompositionFormSession();
  const rolled = isRolledArpeggio(entry.arpeggio);

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <OptionalSelect<ArpeggioType>
        label="Sign"
        options={ARPEGGIOS}
        value={entry.arpeggio}
        onChange={(arpeggio) => updateEntry({ ...entry, arpeggio })}
      />
      {rolled && (
        <>
          <OptionalSelect<HairpinKind>
            label="Dynamic change during the roll"
            options={HAIRPIN_KINDS}
            value={entry.arpeggioHairpin}
            onChange={(arpeggioHairpin) =>
              updateEntry({ ...entry, arpeggioHairpin })
            }
          />
          {entry.arpeggioHairpin && (
            <div className="flex gap-2">
              <div className="flex-1">
                <OptionalSelect<DynamicMarking>
                  label="From"
                  options={DYNAMICS}
                  value={entry.arpeggioHairpinFrom}
                  onChange={(arpeggioHairpinFrom) =>
                    updateEntry({ ...entry, arpeggioHairpinFrom })
                  }
                />
              </div>
              <div className="flex-1">
                <OptionalSelect<DynamicMarking>
                  label="To"
                  options={DYNAMICS}
                  value={entry.arpeggioHairpinTo}
                  onChange={(arpeggioHairpinTo) =>
                    updateEntry({ ...entry, arpeggioHairpinTo })
                  }
                />
              </div>
            </div>
          )}
        </>
      )}
      <OptionalSelect<ConnectorRole>
        label="Sempre arpeggiando passage"
        options={ARPEGGIATE_ROLES}
        value={entry.arpeggiate}
        onChange={(arpeggiate) => updateEntry({ ...entry, arpeggiate })}
      />
    </div>
  );
}
