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








# TODO Music Notation Attributes List

A categorized reference for all note-level attributes, markings, and techniques for use in a music notation app.

---

## 1. Articulations

These define how a note begins, sustains, and ends.

| Symbol | Name | Description |
|--------|------|-------------|
| `.` | Staccato | Short, detached â€” play about half the note's value |
| `..` | Staccatissimo | Very short, even more detached than staccato |
| `â€”` | Tenuto | Hold the full value; slight emphasis |
| `>` | Accent (Standard) | Emphasize the note with a strong attack |
| `^` | Marcato | Strong accent with a tapering tone; "marked" |
| `âˆ§` | Strong Accent / Hat | Even stronger than marcato |
| `~` | Stress Mark | Broad emphasis, common in orchestral writing |
| `-` | Non-legato / Portato | Slightly separated but not staccato |

---

## 2. Dynamics

These control the volume/intensity of a note or passage.

| Marking | Name | Meaning |
|---------|------|---------|
| `ppp` | Pianississimo | Extremely soft |
| `pp` | Pianissimo | Very soft |
| `p` | Piano | Soft |
| `mp` | Mezzo-piano | Moderately soft |
| `mf` | Mezzo-forte | Moderately loud |
| `f` | Forte | Loud |
| `ff` | Fortissimo | Very loud |
| `fff` | Fortississimo | Extremely loud |
| `fp` | Forte-piano | Loud then immediately soft |
| `sfz` / `sf` | Sforzando | Sudden, forced accent |
| `rfz` / `rf` | Rinforzando | Reinforced accent |
| `fz` | Forzando | Forced emphasis |
| `<` | Crescendo | Gradually getting louder |
| `>` | Decrescendo / Diminuendo | Gradually getting softer |

---

## 3. Ornaments

Short melodic decorations applied to a note.

| Name | Symbol / Notation | Description |
|------|------------------|-------------|
| Trill | `tr` or `tr~~~` | Rapid alternation between the note and the one above |
| Trill with ending | `tr` + turn | Trill that resolves with a turn figure |
| Mordent (Lower) | `ð†©` | Quick lower-neighbor figure (note â†’ below â†’ note) |
| Inverted Mordent (Upper) | `ð†ª` | Quick upper-neighbor figure (note â†’ above â†’ note) |
| Turn | `âˆž` or `ð„Ž` | Four-note figure: above â†’ note â†’ below â†’ note |
| Inverted Turn | Reversed turn symbol | Below â†’ note â†’ above â†’ note |
| Appoggiatura | Small note (slurred) | Leaning grace note; takes half the beat value |
| Acciaccatura | Small note with slash | "Crushed" grace note; played almost simultaneously |
| Grace Note (single) | Small flagged note | A quick ornamental note before the main note |
| Grace Note (multiple) | Small beamed notes | A run of quick ornamental notes |
| Glissando | `gliss.` + line | Slide between two pitches |
| Portamento | Curved line | Smooth, vocal-style slide between pitches |

---

## 4. Bowing & String Techniques

Specific to stringed instruments (violin, cello, guitar, etc.).

| Name | Notation | Description |
|------|----------|-------------|
| Down-bow | `âŠ“` | Bow moves downward |
| Up-bow | `V` | Bow moves upward |
| Spiccato | Dot below note | Bouncing bow stroke |
| SautillÃ© | Marking or indication | Rapid bouncing bow |
| Col legno | `col legno` | Play with the wood of the bow |
| Sul ponticello | `sul pont.` | Play near the bridge (nasal tone) |
| Sul tasto | `sul tasto` | Play over the fingerboard (flute-like tone) |
| Arco | `arco` | Return to bowing (after pizzicato) |
| Pizzicato | `pizz.` | Pluck the string |
| Snap Pizzicato (BartÃ³k) | Circle with line | Snap string against fingerboard |
| Tremolo (bowed) | Slashes through stem | Very rapid repeated bowing |
| Double Stop | Two notes stacked | Play two strings simultaneously |
| Triple/Quad Stop | Three/four notes stacked | Play three or four strings |

---

## 5. Guitar & Fretted Instrument Techniques

| Name | Notation | Description |
|------|----------|-------------|
| Hammer-on | `H` or `h` | Left-hand finger strikes string without picking |
| Pull-off | `P` or `p` | Left-hand finger pulls off to sound a lower note |
| Bend | `B` + arrow or curve | Push string sideways to raise pitch |
| Bend & Release | `BR` | Bend up then return to original pitch |
| Pre-bend | `PB` | Bend before picking |
| Vibrato | `~` or `vib.` | Oscillate pitch slightly above and below |
| Wide Vibrato | `~~~` | Exaggerated vibrato |
| Slide Up | `/` | Slide into note from below |
| Slide Down | `\` | Slide into note from above |
| Legato Slide | `sl.` with line | Slide without re-picking |
| Palm Mute | `P.M. -----` | Rest palm on strings near bridge |
| Natural Harmonic | Diamond note head | Lightly touch string at node point |
| Artificial Harmonic | Note + diamond above | Fret a note, touch an octave node |
| Tapping | `T` | Right-hand finger taps the fretboard |
| Whammy Bar Dip | Notation + arrow | Depress tremolo bar momentarily |
| Whammy Bar Vibrato | Notation + wavy | Vibrato using tremolo bar |
| Rake | Scratch notation | Drag pick across muted strings |
| Sweep Picking | Arpeggio + pick dir. | Pick across strings in one fluid motion |

---

## 6. Wind & Brass Techniques

| Name | Notation | Description |
|------|----------|-------------|
| Tongue | `t` or `Tu` | Articulate note with tongue |
| Double Tongue | `T-K` | Rapid double articulation |
| Triple Tongue | `T-K-T` | Rapid triple articulation |
| Flutter Tongue | `flz.` or `flutter` | Roll the tongue while playing |
| Growl | `growl` | Sing into instrument while playing |
| Multiphonics | Special notation | Produce multiple pitches simultaneously |
| Half-valve | `(+)` or special mark | Depress valve halfway for microtone/effect |
| Glissando | `gliss.` | Slide between pitches (trombones especially) |
| Stopped (Horn) | `+` | Hand stops bell (French Horn) |
| Open (Horn) | `o` | Remove hand from bell |
| Mute | `con sord.` | Use a mute |
| Remove Mute | `senza sord.` | Take off the mute |
| Sforzando Tongue | `sfz` + note | Explosive tongued attack |

---

## 7. Percussion & Keyboard Techniques

| Name | Notation | Description |
|------|----------|-------------|
| Roll (closed) | `z` on stem | Sustained tremolo roll |
| Roll (open) | Measured beams | Measured individual strokes |
| Rim Shot | `x` notehead | Hit head and rim simultaneously |
| Cross Stick | `x` on staff | Place tip of stick on head, hit rim |
| Dead Stroke | Parenthesized note | Dampen immediately after striking |
| Brush | `br.` | Use wire brush instead of stick |
| Mallet type | Indication text | Soft/hard/brass mallets etc. |
| Pedal Down | `Ped` or `ð„¿` | Depress sustain pedal (piano) |
| Pedal Up | `*` or `ð„¾` | Release sustain pedal (piano) |
| Half Pedal | `1/2 Ped` | Partial pedal depression |
| Una Corda | `u.c.` | Soft pedal (piano) |
| Tre Corde | `t.c.` | Release soft pedal |
| Inside Piano | Instruction text | Pluck/strum/mute strings inside piano |

---

## 8. Pitch Modifiers & Microtones

| Name | Symbol | Description |
|------|--------|-------------|
| Sharp | `â™¯` | Raise pitch one semitone |
| Flat | `â™­` | Lower pitch one semitone |
| Natural | `â™®` | Cancel previous accidental |
| Double Sharp | `ð„ª` | Raise pitch two semitones |
| Double Flat | `ð„«` | Lower pitch two semitones |
| Quarter-tone Sharp | `â†‘â™¯` or `+` | Raise by a quarter tone |
| Quarter-tone Flat | `â†“â™­` or `-` | Lower by a quarter tone |
| Three-quarter Sharp | Special symbol | Raise by three quarter tones |
| Three-quarter Flat | Special symbol | Lower by three quarter tones |
| Pitch Bend (generic) | Arrow + note | Vague directional pitch bend |

---

## 9. Note Duration Modifiers

These alter the rhythmic length of a note.

| Name | Notation | Description |
|------|----------|-------------|
| Dot | `.` after note | Adds 50% of note's value |
| Double Dot | `..` after note | Adds 75% of note's value |
| Triple Dot | `...` after note | Adds 87.5% of note's value |
| Tie | Curved line | Extends note across a barline |
| Tuplet / Triplet | Bracket with number | Groups of notes in irregular rhythms |
| Fermata | `ð„` | Hold the note longer than written |
| Short Fermata | Pointed fermata | Shorter than normal fermata |
| Long Fermata | Square fermata | Longer than normal fermata |
| Ad libitum | `ad lib.` | At the performer's discretion |

---

## 10. Slurs, Ties & Phrasing

| Name | Notation | Description |
|------|----------|-------------|
| Slur | Curved line over notes | Play notes legato (connected) |
| Tie | Curved line, same pitch | Extends note duration |
| Phrase Mark | Long curved line | Groups a musical phrase visually |
| Hairpin Crescendo | `<` hairpin | Get louder over a span of notes |
| Hairpin Decrescendo | `>` hairpin | Get softer over a span of notes |
| Niente | `n` or circle at end | Fade to/from silence |

---

## 11. Tempo & Expressive Markings

| Marking | Meaning |
|---------|---------|
| `accel.` | Accelerando â€” gradually speed up |
| `rit.` / `rall.` | Ritardando / Rallentando â€” gradually slow down |
| `rubato` | Flexible tempo |
| `a tempo` | Return to original tempo |
| `poco a poco` | Little by little |
| `subito` | Suddenly |
| `espressivo` | Expressively |
| `con fuoco` | With fire |
| `dolce` | Sweetly |
| `pesante` | Heavily |
| `leggiero` | Lightly |
| `cantabile` | In a singing style |

---

## 12. Repeat & Structure Symbols

| Symbol | Name | Description |
|--------|------|-------------|
| `||: :||` | Repeat barlines | Repeat the enclosed section |
| `1. / 2.` | First/Second Ending | Different endings for repeats |
| `D.C.` | Da Capo | Go back to the beginning |
| `D.S.` | Dal Segno | Go back to the `ð„‹` sign |
| `Fine` | Fine | The end (used with D.C./D.S.) |
| `ð„‹` | Segno | Marker for D.S. |
| `ð„Œ` | Coda | A separated closing section |
| `al Coda` | To the Coda | Jump to the Coda symbol |
| `8va` | Ottava alta | Play one octave higher |
| `8vb` | Ottava bassa | Play one octave lower |
| `15ma` | Two octaves higher | Play two octaves higher |

---

## 13. Special / Extended Techniques

| Name | Context | Description |
|------|---------|-------------|
| Multiphonics | Wind/Voice | Produce multiple pitches at once |
| Sprechstimme | Voice | Half-sung, half-spoken |
| Cluster | Keyboard | Play a dense group of adjacent notes |
| Prepared Piano | Piano | Objects placed on strings to alter tone |
| Con sordino | Strings/Brass | Play with a mute |
| Senza sordino | Strings/Brass | Play without a mute |
| Sul ponticello | Strings | Near the bridge |
| Sul tasto | Strings | Over the fingerboard |
| Ordinario (ord.) | Any | Return to normal playing technique |
| Loco | Any | Play as written (cancel 8va etc.) |
| Flautando | Strings | Flute-like, light bowing |
| JetÃ© | Strings | Throw the bow for multiple bouncing strokes |
| Flageolet | Strings/Guitar | Natural harmonic; light airy tone |

---

*This document is intended as a living reference â€” add instrument-specific or genre-specific techniques as needed.*
