import { computeBandOverflow, maxVerticalBand } from './verticalSpaceRules';

describe('computeBandOverflow', () => {
  const rows = [
    { top: 100, bottom: 200 },
    { top: 300, bottom: 400 },
  ];

  it('reserves nothing for a curve that stays inside its row', () => {
    expect(
      computeBandOverflow(rows, [{ anchorY: 150, top: 120, bottom: 180 }], 5)
    ).toEqual([
      { top: 0, bottom: 0 },
      { top: 0, bottom: 0 },
    ]);
  });

  it("grows the row containing the curve's anchor, above and below independently", () => {
    expect(
      computeBandOverflow(
        rows,
        [
          { anchorY: 350, top: 260, bottom: 380 },
          { anchorY: 150, top: 120, bottom: 230 },
        ],
        5
      )
    ).toEqual([
      { top: 0, bottom: 35 },
      { top: 45, bottom: 0 },
    ]);
  });

  it('assigns a curve outside every row to the nearest one', () => {
    expect(
      computeBandOverflow(rows, [{ anchorY: 280, top: 270, bottom: 290 }], 0)
    ).toEqual([
      { top: 0, bottom: 0 },
      { top: 30, bottom: 0 },
    ]);
  });

  it("takes the largest requirement among a row's curves", () => {
    expect(
      computeBandOverflow(
        [rows[0]],
        [
          { anchorY: 150, top: 90, bottom: 180 },
          { anchorY: 160, top: 40, bottom: 180 },
        ],
        0
      )
    ).toEqual([{ top: 60, bottom: 0 }]);
  });
});

describe('maxVerticalBand', () => {
  it('takes the larger value per side independently', () => {
    expect(
      maxVerticalBand([
        { top: 50, bottom: 0 },
        { top: 10, bottom: 20 },
      ])
    ).toEqual({ top: 50, bottom: 20 });
  });

  it('is zero when there are no bands', () => {
    expect(maxVerticalBand([])).toEqual({ top: 0, bottom: 0 });
  });
});
