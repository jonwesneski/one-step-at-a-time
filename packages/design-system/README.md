# @rest-in-time/design-system

Web Components library for rendering music notation in the browser.

## Staff Class Hierarchy

```
StaffElementBase              (staffBase.ts)         — shadow DOM, lifecycle, abstract render()
├── StaffClassicalElementBase (staffClassicalBase.ts) — key sig, time sig, note Y-coords, beam/note rendering
│   ├── StaffTrebleElement    (staffTreble.ts)        — treble clef, Y-coord map, key sig Y-coords
│   └── StaffBassElement      (staffBass.ts)          — bass clef, Y-coord map, key sig Y-coords
└── StaffGuitarTabElement     (staffGuitarTab.ts)     — 6-line tab staff, no music theory
```
