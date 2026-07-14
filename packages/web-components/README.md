# @one-step-at-a-time/web-components

Web Components library for rendering music notation in the browser.

## Staff Class Hierarchy

```
StaffElementBase              (staffBase.ts)         — shadow DOM, lifecycle, abstract render()
├── StaffClassicalElementBase (staffClassicalBase.ts) — key sig, time sig, note Y-coords, beam/note rendering
│   ├── StaffElement          (staff/staff.ts)        — clef-driven staff (`clef` attribute: treble/bass), <music-clef> mid-stream clef changes
│   └── StaffVocalElement     (staffVocal.ts)         — voice-driven staff, lyrics
└── StaffGuitarTabElement     (staffGuitarTab.ts)     — 6-line tab staff, no music theory
```

Clef data (Y-coordinate maps, octave ranges, key-signature tables, SVG glyphs) lives in `rules/clefRules.ts`, keyed by `ClefType`. A `<music-clef>` element placed inside a `<music-staff>`'s note stream marks a mid-piece clef change — it reserves horizontal space but does not consume beat duration.
