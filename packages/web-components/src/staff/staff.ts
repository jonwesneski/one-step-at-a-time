import { getClefRenderData } from '../rules/clefRules';
import { StaffClassicalElementBase } from '../staffClassicalBase';
import type { YCoordinates } from '../types/elements';
import { ClefType, Octave } from '../types/theory';
import { MUSIC_STAFF } from '../utils/consts';
import { parseClef } from '../utils/parsers';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffElement extends StaffClassicalElementBase {
    static override get observedAttributes(): string[] {
      return [...super.observedAttributes, 'clef'];
    }

    get clef(): ClefType {
      return parseClef(this.getAttribute('clef')) ?? 'treble';
    }

    set clef(value: ClefType) {
      this.setAttribute('clef', value);
    }

    protected override get ownClef(): ClefType {
      return this.clef;
    }

    get yCoordinates(): YCoordinates {
      return getClefRenderData(this.clef).yCoordinates;
    }

    get octaves(): Octave[] {
      return getClefRenderData(this.clef).octaves;
    }

    public getKeyYCoordinates(): { useSharps: boolean; coordinates: number[] } {
      const {
        majorSharpYCoordinates,
        minorSharpYCoordinates,
        majorFlatYCoordinates,
        minorFlatYCoordinates,
      } = getClefRenderData(this.clef);
      const _key = this.keySig;
      const answer: { useSharps: boolean; coordinates: number[] } = {
        useSharps: false,
        coordinates: [],
      };
      if (this.mode === 'major') {
        answer.useSharps = !!majorSharpYCoordinates[_key];
        answer.coordinates =
          majorSharpYCoordinates[_key] ?? majorFlatYCoordinates[_key] ?? [];
      } else {
        answer.useSharps = !!minorSharpYCoordinates[_key];
        answer.coordinates =
          minorSharpYCoordinates[_key] ?? minorFlatYCoordinates[_key] ?? [];
      }
      return answer;
    }

    protected get clefSvg(): string {
      return getClefRenderData(this.clef).clefSvg;
    }
  }

  if (!customElements.get(MUSIC_STAFF)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the Base-Element has runtime typing
    customElements.define(MUSIC_STAFF, StaffElement as any);
  }
}
