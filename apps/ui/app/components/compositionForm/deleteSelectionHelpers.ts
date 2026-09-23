import { findGroupMembers } from './staffGroupsHelpers';
import type { CompositionStructure, Selection } from './types';
import { isPitchedEntry } from './types';
import { staffEntryIds } from './voiceHelpers';

export function removeSelectionFromStructure(
  structure: CompositionStructure,
  selection: Selection
): CompositionStructure {
  const selectedMeasureIds = new Set(selection.measureIds);

  const staffIdsToDelete = new Set(selection.staffIds);
  for (const measureId of selectedMeasureIds) {
    for (const staffId of structure.measuresById[measureId]?.staffIds ?? []) {
      staffIdsToDelete.add(staffId);
    }
  }

  const entryIdsToDelete = new Set(selection.entryIds);
  for (const staffId of staffIdsToDelete) {
    const staff = structure.stavesById[staffId];
    for (const entryId of staff ? staffEntryIds(staff) : []) {
      entryIdsToDelete.add(entryId);
    }
  }

  let measureOrder = structure.measureOrder.filter(
    (id) => !selectedMeasureIds.has(id)
  );
  let measuresById = Object.fromEntries(
    Object.entries(structure.measuresById)
      .filter(([id]) => !selectedMeasureIds.has(id))
      .map(([id, measure]) => [
        id,
        {
          ...measure,
          staffIds: measure.staffIds.filter(
            (sid) => !staffIdsToDelete.has(sid)
          ),
        },
      ])
  );

  // The composition must always have at least one measure so the
  // "add a staff" placeholder has somewhere to attach.
  if (measureOrder.length === 0) {
    const newId = crypto.randomUUID();
    measureOrder = [newId];
    measuresById = { [newId]: { id: newId, staffIds: [] } };
  }
  const stavesById = Object.fromEntries(
    Object.entries(structure.stavesById)
      .filter(([id]) => !staffIdsToDelete.has(id))
      .map(([id, staff]) => {
        const voicesById = Object.fromEntries(
          staff.voiceOrder.map((voiceId) => {
            const voice = staff.voicesById[voiceId];
            return [
              voiceId,
              {
                ...voice,
                entryIds: voice.entryIds.filter(
                  (eid) => !entryIdsToDelete.has(eid)
                ),
              },
            ];
          })
        );
        // A voice left with zero entries is dropped, mirroring the "group
        // dropped below 2 staves" repair below — but a staff always keeps at
        // least its first voice, even if empty, so the composition never ends
        // up with a staff that has nowhere for the next entry to go, and so
        // deleting voice 1's last note never silently promotes voice 2 into
        // voice 1's own stem-direction policy.
        const voiceOrder = staff.voiceOrder.filter(
          (voiceId, index) =>
            index === 0 || voicesById[voiceId].entryIds.length > 0
        );
        const survivingVoicesById = Object.fromEntries(
          voiceOrder.map((voiceId) => [voiceId, voicesById[voiceId]])
        );
        return [id, { ...staff, voiceOrder, voicesById: survivingVoicesById }];
      })
  );
  let entriesById = Object.fromEntries(
    Object.entries(structure.entriesById).filter(
      ([id]) => !entryIdsToDelete.has(id)
    )
  );

  // A tuplet needs at least two members; drop any that fell below that and
  // clear the dangling tupletId on the entries that were left in it.
  const survivingMembers = new Map<string, number>();
  for (const entry of Object.values(entriesById)) {
    if (isPitchedEntry(entry) && entry.tupletId) {
      survivingMembers.set(
        entry.tupletId,
        (survivingMembers.get(entry.tupletId) ?? 0) + 1
      );
    }
  }
  const tupletsById = Object.fromEntries(
    Object.entries(structure.tupletsById).filter(
      ([id]) => (survivingMembers.get(id) ?? 0) >= 2
    )
  );
  entriesById = Object.fromEntries(
    Object.entries(entriesById).map(([id, entry]) => [
      id,
      isPitchedEntry(entry) && entry.tupletId && !tupletsById[entry.tupletId]
        ? { ...entry, tupletId: null }
        : entry,
    ])
  );

  // Drop any tie/slur/hairpin whose start or end entry is gone.
  const connectorsById = Object.fromEntries(
    Object.entries(structure.connectorsById).filter(
      ([, connector]) =>
        !entryIdsToDelete.has(connector.startEntryId) &&
        !entryIdsToDelete.has(connector.endEntryId)
    )
  );
  const connectorOrder = structure.connectorOrder.filter(
    (id) => connectorsById[id]
  );

  // A deleted staff can orphan its former brace/bracket partner (e.g. one side
  // of a 2-staff brace). Clear group/groupId on any staff that no longer has a
  // grouped partner so invalid group state never persists.
  const cleanedStavesById = { ...stavesById };
  for (const measure of Object.values(measuresById)) {
    measure.staffIds.forEach((id) => {
      const staff = cleanedStavesById[id];
      if (!staff.group && !staff.groupId) return;
      const members = findGroupMembers(measure.staffIds, cleanedStavesById, id);
      if (members.length < 2) {
        cleanedStavesById[id] = { ...staff, group: null, groupId: null };
      }
    });
  }

  return {
    timeSig: structure.timeSig,
    measureOrder,
    measuresById,
    stavesById: cleanedStavesById,
    entriesById,
    connectorsById,
    connectorOrder,
    tupletsById,
  };
}
