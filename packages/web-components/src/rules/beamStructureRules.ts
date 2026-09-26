export type BeamLineDescriptor = {
  fromNoteIndex: number;
  toNoteIndex: number;
  beamLevel: number;
  fractionalBeamSide?: 'left' | 'right';
};

/**
 * Derives the beam structure (which notes are joined by a beam line at each
 * level) purely from each note's own beam count (flag count: eighth=1,
 * sixteenth=2, …) — no note position, duration type, or DOM involved. Level 0
 * always produces exactly one full-span primary beam across every note in the
 * group (called only for >=2 beamable notes, so this is always non-null).
 * Level 1+ produces either a full-span secondary beam (a consecutive run of
 * notes sharing that level) or a fractional (partial/stub) beam for an
 * isolated note at that level, stubbed toward its nearest neighbor (left if
 * it has a predecessor in the group, right otherwise).
 */
export function computeBeamLevelStructure(beamCounts: readonly number[]): {
  primaryBeam: BeamLineDescriptor;
  secondaryBeams: BeamLineDescriptor[];
  fractionalBeams: BeamLineDescriptor[];
} {
  let primaryBeam: BeamLineDescriptor | undefined;
  const secondaryBeams: BeamLineDescriptor[] = [];
  const fractionalBeams: BeamLineDescriptor[] = [];
  const maxBeamCount = Math.max(...beamCounts);

  for (let level = 0; level < maxBeamCount; level++) {
    let beamRunStart = -1;
    for (let i = 0; i <= beamCounts.length; i++) {
      const participatesAtLevel =
        i < beamCounts.length && beamCounts[i] > level;

      if (participatesAtLevel && beamRunStart === -1) {
        beamRunStart = i;
      } else if (!participatesAtLevel && beamRunStart !== -1) {
        const runEnd = i - 1;
        if (runEnd > beamRunStart) {
          // Multiple notes — full beam run at this level.
          const beamLine: BeamLineDescriptor = {
            fromNoteIndex: beamRunStart,
            toNoteIndex: runEnd,
            beamLevel: level,
          };
          if (level === 0) {
            primaryBeam = beamLine;
          } else {
            secondaryBeams.push(beamLine);
          }
        } else {
          // Single isolated note — fractional (partial/stub) beam toward the nearest neighbor.
          const fractionalBeamSide = beamRunStart > 0 ? 'left' : 'right';
          fractionalBeams.push({
            fromNoteIndex: beamRunStart,
            toNoteIndex: beamRunStart,
            beamLevel: level,
            fractionalBeamSide,
          });
        }
        beamRunStart = -1;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- called only for >=2 beamable notes, so a full-span primary beam is always built above
  return { primaryBeam: primaryBeam!, secondaryBeams, fractionalBeams };
}
