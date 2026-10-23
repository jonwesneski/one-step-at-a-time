export type VerticalBand = { top: number; bottom: number };

/** Something drawn in an overlay: its vertical extent and the y it belongs at. */
export type VerticalExtent = { anchorY: number; top: number; bottom: number };

export const EMPTY_VERTICAL_BAND: VerticalBand = { top: 0, bottom: 0 };

/**
 * How far (px) each band must grow above its top and below its bottom so every
 * extent stays inside it, plus `clearance`. An extent belongs to the band
 * containing its `anchorY`, else the nearest band. Bands are measured without
 * the margin this result is applied as, and extents move with their band, so
 * re-measuring after applying it yields the same answer.
 */
export function computeBandOverflow(
  bands: readonly VerticalBand[],
  extents: readonly VerticalExtent[],
  clearance: number
): VerticalBand[] {
  const overflow = bands.map(() => ({ ...EMPTY_VERTICAL_BAND }));
  if (bands.length === 0) {
    return overflow;
  }
  const distanceTo = (band: VerticalBand, y: number): number =>
    y < band.top ? band.top - y : y > band.bottom ? y - band.bottom : 0;
  for (const extent of extents) {
    let bandIndex = 0;
    for (let i = 1; i < bands.length; i++) {
      if (
        distanceTo(bands[i], extent.anchorY) <
        distanceTo(bands[bandIndex], extent.anchorY)
      ) {
        bandIndex = i;
      }
    }
    const band = bands[bandIndex];
    const needed = overflow[bandIndex];
    needed.top = Math.max(
      needed.top,
      Math.ceil(band.top - extent.top + clearance)
    );
    needed.bottom = Math.max(
      needed.bottom,
      Math.ceil(extent.bottom - band.bottom + clearance)
    );
  }
  return overflow;
}

/** The larger value per side across every band; zero when there are none. */
export function maxVerticalBand(bands: Iterable<VerticalBand>): VerticalBand {
  const result = { ...EMPTY_VERTICAL_BAND };
  for (const band of bands) {
    result.top = Math.max(result.top, band.top);
    result.bottom = Math.max(result.bottom, band.bottom);
  }
  return result;
}
