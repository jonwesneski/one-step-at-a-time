import { Radio } from '@/design-system';
import type {
  GlissandoHint,
  TieStyle,
} from '@one-step-at-a-time/web-components';
import {
  GLISSANDO_HINTS,
  TIE_STYLES,
} from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { ConnectorEndpoints } from './connectorsHelpers';
import {
  canTie,
  connectorBetween,
  setConnectorOptions,
  TECHNIQUE_KINDS,
} from './connectorsHelpers';
import { OptionalSelect } from './entryControls';
import type { CompositionStructure, ConnectorKind, MusicEntry } from './types';

const TIE_SLUR: ConnectorKind[] = ['tie', 'slur'];
const HAIRPINS: ConnectorKind[] = ['crescendo', 'decrescendo'];
const GLISSANDO: ConnectorKind[] = ['glissando'];
const TECHNIQUE_LABELS: Partial<Record<ConnectorKind, string>> = {
  'hammer-on': 'Hammer-on',
  'pull-off': 'Pull-off',
  slide: 'Slide',
};

type TieSlurChoice = 'none' | 'tie' | 'slur';
type HairpinChoice = 'none' | 'crescendo' | 'decrescendo' | 'diminuendo';

interface ConnectorInputProps {
  endpoints: ConnectorEndpoints;
  selectionEntryCount: number;
  structure: CompositionStructure;
  onSetConnector: (
    startEntryId: string,
    endEntryId: string,
    kind: ConnectorKind | null,
    family: ConnectorKind[]
  ) => void;
}

function entryLabel(entry: MusicEntry | undefined): string {
  if (!entry) {
    return '?';
  }
  if (entry.type === 'note') {
    return entry.value;
  }
  if (entry.type === 'chord') {
    return entry.notes.map((n) => n.value).join('/');
  }
  return entry.type;
}

export function ConnectorInput({
  endpoints,
  selectionEntryCount,
  structure,
  onSetConnector,
}: ConnectorInputProps) {
  const { startEntryId, endEntryId } = endpoints;
  const tieSlur = connectorBetween(
    structure,
    startEntryId,
    endEntryId,
    TIE_SLUR
  );
  const hairpin = connectorBetween(
    structure,
    startEntryId,
    endEntryId,
    HAIRPINS
  );

  const glissando = connectorBetween(
    structure,
    startEntryId,
    endEntryId,
    GLISSANDO
  );
  const { editStructure } = useCompositionFormSession();
  // A tab note takes ties, slurs and guitar techniques; no hairpins or
  // glissandi.
  const isTab = structure.entriesById[startEntryId]?.type === 'guitar-note';
  const technique = connectorBetween(
    structure,
    startEntryId,
    endEntryId,
    TECHNIQUE_KINDS
  );

  const tieSlurChoice: TieSlurChoice =
    (tieSlur?.kind as TieSlurChoice) ?? 'none';
  const hairpinChoice: HairpinChoice =
    (hairpin?.kind as HairpinChoice) ?? 'none';

  const startEntry = structure.entriesById[startEntryId];
  const endEntry = structure.entriesById[endEntryId];

  const tieAllowed = selectionEntryCount === 2 && canTie(structure, endpoints);

  let tieReason: string | null = null;
  if (!tieAllowed && tieSlurChoice !== 'tie') {
    if (selectionEntryCount !== 2) {
      tieReason = 'Select exactly two notes to tie.';
    } else if (startEntry?.type !== endEntry?.type) {
      tieReason = 'A tie needs two notes or two chords.';
    } else if (
      (startEntry?.type === 'note' || startEntry?.type === 'chord') &&
      (startEntry.laissezVibrer ||
        ((endEntry?.type === 'note' || endEntry?.type === 'chord') &&
          endEntry.laissezVibrer))
    ) {
      tieReason = 'One of them already has a laissez-vibrer (l.v.) tie.';
    } else {
      tieReason = 'A tie needs the same pitch on adjacent notes.';
    }
  }

  const setTieSlur = (choice: TieSlurChoice) => {
    onSetConnector(
      startEntryId,
      endEntryId,
      choice === 'none' ? null : choice,
      TIE_SLUR
    );
  };
  const setHairpin = (choice: HairpinChoice) => {
    onSetConnector(
      startEntryId,
      endEntryId,
      choice === 'none'
        ? null
        : choice === 'diminuendo'
        ? 'decrescendo'
        : choice,
      HAIRPINS
    );
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-sm text-fg-muted">
        Connect {entryLabel(startEntry)} → {entryLabel(endEntry)}
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-fg-muted mb-1">
          Tie / Slur
        </legend>
        <Radio
          name="tie-slur"
          label="None"
          checked={tieSlurChoice === 'none'}
          onChange={() => setTieSlur('none')}
        />
        <Radio
          name="tie-slur"
          label="Tie"
          checked={tieSlurChoice === 'tie'}
          disabled={!tieAllowed && tieSlurChoice !== 'tie'}
          onChange={() => setTieSlur('tie')}
        />
        <Radio
          name="tie-slur"
          label="Slur"
          checked={tieSlurChoice === 'slur'}
          onChange={() => setTieSlur('slur')}
        />
        {tieReason && <div className="text-sm text-fg-subtle">{tieReason}</div>}
        {tieSlur?.kind === 'tie' && (
          <OptionalSelect<TieStyle>
            label="Tie style"
            options={TIE_STYLES.filter((style) => style !== 'solid')}
            value={tieSlur.style}
            noneLabel="solid"
            onChange={(style) =>
              editStructure((s) =>
                setConnectorOptions(s, tieSlur.id, { style })
              )
            }
          />
        )}
      </fieldset>

      {isTab ? (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-fg-muted mb-1">
              Technique
            </legend>
            <Radio
              name="technique"
              label="None"
              checked={!technique}
              onChange={() =>
                onSetConnector(startEntryId, endEntryId, null, TECHNIQUE_KINDS)
              }
            />
            {TECHNIQUE_KINDS.map((kind) => (
              <Radio
                key={kind}
                name="technique"
                label={TECHNIQUE_LABELS[kind]}
                checked={technique?.kind === kind}
                onChange={() =>
                  onSetConnector(
                    startEntryId,
                    endEntryId,
                    kind,
                    TECHNIQUE_KINDS
                  )
                }
              />
            ))}
          </fieldset>
        </>
      ) : (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-fg-muted mb-1">
              Glissando
            </legend>
            <Radio
              name="glissando"
              label="None"
              checked={!glissando}
              onChange={() =>
                onSetConnector(startEntryId, endEntryId, null, GLISSANDO)
              }
            />
            <Radio
              name="glissando"
              label="Glissando"
              checked={Boolean(glissando)}
              disabled={selectionEntryCount !== 2 && !glissando}
              onChange={() =>
                onSetConnector(startEntryId, endEntryId, 'glissando', GLISSANDO)
              }
            />
            {selectionEntryCount !== 2 && !glissando && (
              <div className="text-sm text-fg-subtle">
                Select exactly two notes for a glissando.
              </div>
            )}
            {glissando && (
              <OptionalSelect<GlissandoHint>
                label="Keys it slides across"
                options={GLISSANDO_HINTS}
                value={glissando.hint}
                noneLabel="unspecified"
                onChange={(hint) =>
                  editStructure((s) =>
                    setConnectorOptions(s, glissando.id, { hint })
                  )
                }
              />
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-fg-muted mb-1">
              Hairpin
            </legend>
            <Radio
              name="hairpin"
              label="None"
              checked={hairpinChoice === 'none'}
              onChange={() => setHairpin('none')}
            />
            <Radio
              name="hairpin"
              label="Crescendo"
              checked={hairpinChoice === 'crescendo'}
              onChange={() => setHairpin('crescendo')}
            />
            <Radio
              name="hairpin"
              label="Decrescendo"
              checked={hairpinChoice === 'decrescendo'}
              onChange={() => setHairpin('decrescendo')}
            />
          </fieldset>
        </>
      )}
    </div>
  );
}
