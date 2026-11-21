import type { VocalType } from '@one-step-at-a-time/web-components';
import type { CompositionStructure, NormalizedStaff } from './types';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

// A staff's own settings, without its id, music or lyrics. New measures
// (addMeasure, rebar) copy these from the staff at the same index; lyrics are
// one measure's text, so they stay with it.
export type StaffSettings = DistributiveOmit<
  NormalizedStaff,
  'id' | 'voiceOrder' | 'voicesById' | 'lyrics'
>;

export function staffSettingsOf(staff: NormalizedStaff): StaffSettings {
  const settings: Partial<NormalizedStaff> & { lyrics?: unknown } = {
    ...staff,
  };
  delete settings.id;
  delete settings.voiceOrder;
  delete settings.voicesById;
  delete settings.lyrics;
  return settings as StaffSettings;
}

// What the Add Staff control creates.
export type NewStaff =
  | { type: 'treble' | 'bass' }
  | { type: 'vocal'; voiceType: VocalType }
  | { type: 'guitar-tab' };

// The staff at the same index in every measure: one part across the piece.
export function staffTrackIds(
  structure: CompositionStructure,
  staffId: string
): string[] {
  const owner = structure.measureOrder
    .map((measureId) => structure.measuresById[measureId])
    .find((measure) => measure?.staffIds.includes(staffId));
  if (!owner) {
    return [];
  }
  const index = owner.staffIds.indexOf(staffId);
  return structure.measureOrder
    .map((measureId) => structure.measuresById[measureId]?.staffIds[index])
    .filter((id): id is string => id !== undefined);
}

export function setStaffTrackLabel(
  structure: CompositionStructure,
  staffId: string,
  label: string | null
): CompositionStructure {
  const normalized = label?.trim() ? label.trim() : null;
  const trackIds = staffTrackIds(structure, staffId);
  if (
    trackIds.every(
      (id) => (structure.stavesById[id]?.label ?? null) === normalized
    )
  ) {
    return structure;
  }
  const stavesById = { ...structure.stavesById };
  for (const id of trackIds) {
    stavesById[id] = { ...stavesById[id], label: normalized };
  }
  return { ...structure, stavesById };
}

function setTrackField<K extends 'part' | 'tabFor'>(
  structure: CompositionStructure,
  staffId: string,
  key: K,
  value: string | null
): CompositionStructure {
  const trackIds = staffTrackIds(structure, staffId);
  const stavesById = { ...structure.stavesById };
  let changed = false;
  for (const id of trackIds) {
    const staff = stavesById[id];
    if (
      !staff ||
      (key === 'tabFor' && staff.type !== 'guitar-tab') ||
      ((staff as Record<string, unknown>)[key] ?? null) === value
    ) {
      continue;
    }
    stavesById[id] = { ...staff, [key]: value } as NormalizedStaff;
    changed = true;
  }
  return changed ? { ...structure, stavesById } : structure;
}

// Names the part a staff track carries. Tabs that followed the old name
// follow the new one; with the name cleared, they follow nothing.
export function setStaffTrackPart(
  structure: CompositionStructure,
  staffId: string,
  part: string | null
): CompositionStructure {
  const normalized = part?.trim() ? part.trim() : null;
  const previous = structure.stavesById[staffId]?.part ?? null;
  let next = setTrackField(structure, staffId, 'part', normalized);
  if (previous && normalized && previous !== normalized) {
    const stavesById = { ...next.stavesById };
    for (const [id, staff] of Object.entries(stavesById)) {
      if (staff.type === 'guitar-tab' && staff.tabFor === previous) {
        stavesById[id] = { ...staff, tabFor: normalized };
      }
    }
    next = { ...next, stavesById };
  }
  return pruneInvalidTabLinks(next);
}

export function setStaffTrackTabFor(
  structure: CompositionStructure,
  staffId: string,
  tabFor: string | null
): CompositionStructure {
  return setTrackField(structure, staffId, 'tabFor', tabFor || null);
}

function measureOfStaff(structure: CompositionStructure, staffId: string) {
  return Object.values(structure.measuresById).find((measure) =>
    measure.staffIds.includes(staffId)
  );
}

// Parts named on the notation staves of a staff's own measure.
export function notationPartsNear(
  structure: CompositionStructure,
  staffId: string
): string[] {
  const measure = measureOfStaff(structure, staffId);
  return [
    ...new Set(
      (measure?.staffIds ?? [])
        .map((id) => structure.stavesById[id])
        .filter((staff) => staff && staff.type !== 'guitar-tab' && staff.part)
        .map((staff) => staff.part as string)
    ),
  ];
}

// Why a tab staff won't follow its `tab-for` in this measure, or null. Mirrors
// the library's rules/tabMirrorRules.ts#resolveTabMirrors: exactly one
// notation staff in the measure must carry that part.
export function tabLinkProblem(
  structure: CompositionStructure,
  staffId: string
): string | null {
  const staff = structure.stavesById[staffId];
  if (staff?.type !== 'guitar-tab' || !staff.tabFor) {
    return null;
  }
  const matches = (measureOfStaff(structure, staffId)?.staffIds ?? []).filter(
    (id) => {
      const other = structure.stavesById[id];
      return (
        other && other.type !== 'guitar-tab' && other.part === staff.tabFor
      );
    }
  ).length;
  if (matches === 0) {
    return `No staff in this bar carries the part “${staff.tabFor}”.`;
  }
  return matches > 1
    ? `Several staves in this bar carry the part “${staff.tabFor}”; name them apart.`
    : null;
}

// Clears a `tab-for` naming a part no staff in the piece carries any more.
export function pruneInvalidTabLinks(
  structure: CompositionStructure
): CompositionStructure {
  const parts = new Set(
    Object.values(structure.stavesById)
      .filter((staff) => staff.type !== 'guitar-tab' && staff.part)
      .map((staff) => staff.part)
  );
  let stavesById: CompositionStructure['stavesById'] | null = null;
  for (const [id, staff] of Object.entries(structure.stavesById)) {
    if (
      staff.type === 'guitar-tab' &&
      staff.tabFor &&
      !parts.has(staff.tabFor)
    ) {
      stavesById ??= { ...structure.stavesById };
      stavesById[id] = { ...staff, tabFor: null };
    }
  }
  return stavesById ? { ...structure, stavesById } : structure;
}
