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


# TODO Staff Annotations (Above & Below the Staff) List

In music notation, these are collectively called **Staff Annotations**, **Score Markings**, or **Notation Text**.  
They are broken into two positional zones: **Above Staff** and **Below Staff**, with some markings that can appear in either depending on context or convention.

---

## What Are They Called?

| Term | Meaning |
|------|---------|
| **Staff Text** | Any freeform text placed above or below a staff |
| **System Text** | Text that applies to ALL staves simultaneously (e.g., tempo markings) |
| **Expression Text** | Stylistic/interpretive instructions (e.g., *cantabile*, *espressivo*) |
| **Technique Text** | Performance technique instructions (e.g., *palm mute*, *col legno*) |
| **Rehearsal Marks** | Letters or numbers used to reference sections during rehearsal |
| **Chord Symbols** | Chord names written above or below for harmonic reference |
| **Figured Bass** | Numbers below the bass line indicating harmony (Baroque style) |
| **Lyrics / Text Underlay** | Sung text placed beneath notes |
| **Fingering** | Numbers indicating which finger to use |
| **Score Directives** | Instructions that redirect playback/flow (D.C., D.S., Coda, etc.) |

---

## ABOVE THE STAFF

### 1. Tempo Markings
Placed at the top of the system, above the first staff. Applies to all parts.

| Marking | Meaning |
|---------|---------|
| `â™©= 120` | Metronome mark â€” exact BPM |
| `Allegro` | Fast and lively (~120â€“168 BPM) |
| `Andante` | Walking pace (~76â€“108 BPM) |
| `Moderato` | Moderate speed |
| `Adagio` | Slow and stately |
| `Largo` | Very slow and broad |
| `Presto` | Very fast |
| `Prestissimo` | As fast as possible |
| `Vivace` | Lively and fast |
| `Grave` | Slow and solemn |
| `Lento` | Slow |
| `accel.` | Accelerando â€” gradually speed up |
| `rit.` / `rall.` | Ritardando / Rallentando â€” gradually slow down |
| `a tempo` | Return to original tempo |
| `Tempo I` | Return to the very first tempo |
| `rubato` | Flexible, expressive tempo |
| `Tempo giusto` | Strict, exact tempo |

---

### 2. Rehearsal Marks
Used for navigation during rehearsal. Usually large and boxed or circled.

| Type | Example | Description |
|------|---------|-------------|
| Letter | `A`, `B`, `C` | Sequential alphabetical markers |
| Number | `1`, `2`, `3` | Sequential numerical markers |
| Measure number | `m. 32` | Refers to a specific bar number |
| Section name | `Verse`, `Chorus`, `Bridge` | Informal or popular-music style labels |
| Rehearsal number in box | `[5]` | Standard orchestral style |
| Rehearsal letter in circle | `â’¶` | Alternative style |

---

### 3. Expression & Style Text
Placed above the staff to guide the character of the performance.

| Marking | Meaning |
|---------|---------|
| `espressivo` / `espress.` | Expressively |
| `cantabile` | In a singing style |
| `dolce` | Sweetly |
| `con fuoco` | With fire |
| `grazioso` | Gracefully |
| `leggiero` | Lightly |
| `pesante` | Heavily |
| `scherzando` | Playfully, jokingly |
| `semplice` | Simply |
| `tranquillo` | Calmly |
| `agitato` | Agitated |
| `misterioso` | Mysteriously |
| `furioso` | Furiously |
| `maestoso` | Majestically |
| `animato` | Animated, lively |
| `con brio` | With vigor |
| `con moto` | With motion |
| `poco a poco` | Little by little |
| `subito` (sub.) | Suddenly |
| `sempre` | Always (e.g., *sempre forte*) |
| `molto` | Very (e.g., *molto rit.*) |
| `meno` | Less (e.g., *meno mosso* â€” less motion) |
| `piÃ¹` | More (e.g., *piÃ¹ forte*) |
| `assai` | Very, quite (e.g., *allegro assai*) |

---

### 4. Technique Directives (Above Staff)
Instructions for how to physically produce the sound. These are specific to the instrument or part they appear above.

| Marking | Context | Meaning |
|---------|---------|---------|
| `arco` | Strings | Return to bowing |
| `pizz.` | Strings | Pluck the string |
| `col legno` | Strings | Play with the wood of the bow |
| `sul pont.` | Strings | Bow near the bridge |
| `sul tasto` | Strings | Bow over the fingerboard |
| `flautando` | Strings | Light, flute-like bowing |
| `con sord.` | Strings/Brass | With mute |
| `senza sord.` | Strings/Brass | Without mute |
| `ord.` / `ordinario` | Any | Return to normal technique |
| `flutter` / `flz.` | Wind | Flutter tongue |
| `palm mute` / `P.M.----` | Guitar | Mute strings with palm near bridge |
| `let ring` / `L.R.----` | Guitar | Allow strings to sustain |
| `tap` / `T` | Guitar | Right-hand tapping |
| `w/ pick` | Guitar | Use a plectrum |
| `w/ fingers` | Guitar | Fingerpick |
| `harmonics` | Guitar/Strings | Play harmonics |
| `straight mute` | Brass | Specific mute type |
| `cup mute` | Brass | Specific mute type |
| `harmon mute` | Brass | Specific mute type (wah effect) |
| `open` | Brass | Remove mute / open bell |
| `loco` | Any | Cancel 8va â€” play as written |
| `ad lib.` | Any | At performer's discretion |
| `sim.` / `simile` | Any | Continue in the same manner |

---

### 5. Octave Lines (8va, 15ma)
Horizontal lines with a text indicator that shift pitch by octaves.

| Marking | Direction | Meaning |
|---------|-----------|---------|
| `8va -------` | Above staff | Play one octave higher than written |
| `8vb -------` | Below staff | Play one octave lower than written |
| `15ma -------` | Above staff | Play two octaves higher |
| `15mb -------` | Below staff | Play two octaves lower |
| `8` (with bracket) | Above/below | Shorthand for the same |

---

### 6. Score Directives & Navigation Marks
These redirect the performer to another part of the score.

| Marking | Name | Meaning |
|---------|------|---------|
| `D.C.` | Da Capo | Go back to the beginning |
| `D.C. al Fine` | Da Capo al Fine | Go back to start, end at *Fine* |
| `D.C. al Coda` | Da Capo al Coda | Go back to start, jump to Coda |
| `D.S.` | Dal Segno | Go back to the `ð„‹` sign |
| `D.S. al Fine` | Dal Segno al Fine | Go to Segno, end at *Fine* |
| `D.S. al Coda` | Dal Segno al Coda | Go to Segno, jump to Coda |
| `Fine` | Fine | The end |
| `ð„‹` | Segno | Target marker for D.S. |
| `ð„Œ` | Coda symbol | The separated ending section |
| `To Coda` / `al Coda` | To the Coda | Jump to the Coda section |
| `Tacet` | Tacet | Instrument is silent for this section |
| `Tacet al fine` | Tacet to the end | Silent from here to the end |
| `V.S.` | Volti Subito | Turn the page quickly |

---

### 7. Trills & Trill Extensions
Text and lines that extend above the staff.

| Marking | Description |
|---------|-------------|
| `tr` | Trill â€” placed above the note |
| `tr~~~~` | Trill with wavy extension line |
| `tr (â™¯)` | Trill with an accidental on the upper note |
| `t.r.` | Trill abbreviation |

---

### 8. Volta Brackets (Repeat Endings)
Horizontal brackets above the staff indicating different endings.

| Marking | Name | Meaning |
|---------|------|---------|
| `1.` | First ending | Play this on the first pass |
| `2.` | Second ending | Play this on the repeat |
| `3.` | Third ending | Play on third pass |
| `1.-3.` | Combined bracket | Play these measures on passes 1â€“3 |

---

## BELOW THE STAFF

### 9. Chord Symbols
The most common below-staff (or sometimes above-staff) element in popular music, jazz, and contemporary notation.

| Type | Example | Description |
|------|---------|-------------|
| Major triad | `C`, `G`, `D` | Just the letter = major chord |
| Minor triad | `Cm`, `Am`, `Em` | Lowercase `m` = minor |
| Dominant 7th | `G7`, `C7` | Major triad + minor 7th |
| Major 7th | `Cmaj7`, `CM7` | Major triad + major 7th |
| Minor 7th | `Dm7`, `Am7` | Minor triad + minor 7th |
| Half-diminished | `BÃ¸7`, `Bm7â™­5` | Minor triad + diminished 7th |
| Diminished 7th | `BÂ°7`, `Bdim7` | Fully diminished |
| Augmented | `C+`, `Caug` | Raised 5th |
| Suspended | `Csus2`, `Csus4` | No 3rd; 2nd or 4th instead |
| Added tones | `Cadd9`, `Gadd11` | Extra tone without full extension |
| Extended | `C9`, `G11`, `F13` | Dominant + extensions |
| Altered | `G7alt`, `G7â™¯11` | With altered tensions |
| Slash chord | `G/B`, `C/E` | Chord over a specific bass note |
| Power chord | `C5` | Root + 5th only |
| No 3rd | `Cno3` | Omit the 3rd |
| Polychord | `F/C` (stacked) | Two chords stacked vertically |

---

### 10. Figured Bass
Used in Baroque music below the bass staff to indicate harmony.

| Figure | Meaning |
|--------|---------|
| `6` | First inversion (6/3 chord) |
| `6/4` | Second inversion |
| `7` | Seventh chord |
| `6/5` | First inversion 7th chord |
| `4/3` | Second inversion 7th chord |
| `4/2` | Third inversion 7th chord |
| `â™¯` / `â™­` | Raise or lower the indicated interval |
| `6/` | Raised 6th |

---

### 11. Lyrics / Text Underlay
Sung text placed directly below the notes it corresponds to.

| Element | Description |
|---------|-------------|
| Syllable | Single syllable per note |
| Hyphen `-` | Connects syllables of the same word across notes |
| Underscore `_` | Extends a syllable across multiple notes |
| Melisma line | A line showing one syllable spans many notes |
| Verse numbers | `1.`, `2.` to indicate multiple verse texts |
| Chorus label | `Cho.` or inline label |

---

### 12. Pedal Markings (Keyboard)
Appear below the grand staff for piano/keyboard.

| Marking | Name | Meaning |
|---------|------|---------|
| `Ped` / `ð„¿` | Pedal down | Depress sustain pedal |
| `*` / `ð„¾` | Pedal up | Release sustain pedal |
| `Ped. simile` | Continue same | Keep using pedal in same pattern |
| Bracket line `âŒ Â¬` | Modern pedal notation | More precise sustain pedal marking |
| `Â½ Ped` | Half pedal | Partial depression |
| `u.c.` | Una corda | Depress soft pedal |
| `t.c.` | Tre corde | Release soft pedal |
| `sost.` | Sostenuto | Depress sostenuto pedal |

---

### 13. Guitar-Specific Below-Staff Markings

| Marking | Description |
|---------|-------------|
| `P.M.----` | Palm mute â€” extends to show duration |
| `T` | Tap (right-hand) |
| Fret numbers (TAB) | Numbers on lines indicating fret positions |
| String numbers in circles | `â‘ â‘¡â‘¢` etc. for classical guitar |
| Position markers | `CII`, `CVII` â€” barre chord position |
| `w/bar` | With tremolo/whammy bar |
| Whammy notation | Shows dip/raise amount (e.g., `1/2 step`) |

---

### 14. Rhythm Notation & Slash Notation
Used in rhythm section parts (guitar, piano, bass, drums) to indicate rhythmic feel without specifying exact notes.

| Element | Description |
|---------|-------------|
| Slash noteheads `/` | Play rhythm freely in the indicated style |
| Rhythmic slashes with stems | Specific rhythms but free pitch choice |
| `comp` or `comping` | Chord instrument â€” comp freely |
| `cont. rhythm` | Continue the established rhythm pattern |
| `cont. simile` | Continue in the same rhythmic style |
| `vamp` | Repeat a pattern until cued |
| `N.C.` | No Chord â€” play melody/bass only, no harmony |
| `tacet` | Rest â€” do not play |
| `play 4x` | Repeat this bar 4 times |
| `%` | Repeat the previous bar |
| `ð„Ž` (two-bar repeat) | Repeat the previous two bars |
| Written chords above slashes | Chord names with rhythmic slashes below |

---

### 15. Fingering Notations
Small numbers placed above or below notes.

| Type | Context | Description |
|------|---------|-------------|
| `1 2 3 4 5` | Piano / keyboard | Thumb = 1, pinky = 5 |
| `0 1 2 3 4` | Guitar (left hand) | Open = 0, index = 1 |
| `p i m a` | Classical guitar (right hand) | Pulgar, indice, medio, anular |
| String numbers `â‘ â€“â‘¥` | Guitar | Which string to play |
| Position numbers | Guitar/Strings | `Pos. II`, `CIV`, etc. |
| Thumb `T` or `+` | Cello/Guitar | Use thumb |

---

### 16. Bowing & Bow Direction (Strings)
Can appear above or below depending on the instrument/score.

| Marking | Name |
|---------|------|
| `âŠ“` | Down-bow |
| `V` | Up-bow |
| `WB` | Whole bow |
| `LH` | Lower half |
| `UH` | Upper half |
| `MB` | Middle of the bow |
| `Pt.` | Point (tip) of the bow |
| `Fr.` | Frog (heel) of the bow |

---

## POSITIONING QUICK REFERENCE

| Category | Typical Position |
|----------|-----------------|
| Tempo markings | Above â€” system-wide |
| Rehearsal marks | Above â€” system-wide |
| Expression text | Above staff |
| Technique text | Above staff |
| 8va / 15ma | Above staff |
| Chord symbols | Above staff (lead sheets) / Below staff (some styles) |
| Trill marks | Above staff |
| Volta brackets | Above staff |
| Score directives (D.C., Coda) | Above staff |
| Dynamics | Below staff (usually) |
| Lyrics | Below staff |
| Figured bass | Below staff |
| Pedal markings | Below staff |
| Rhythm/slash notation labels | Below or within staff |
| Fingering | Above or below depending on direction |
| TAB | Below the standard staff |


