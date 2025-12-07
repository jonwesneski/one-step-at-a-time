import { StaffElementBase } from './staffBase';
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  class StaffGuitarTabElement extends StaffElementBase {
    static #TabSvg = `
      <svg height="80px" width="80px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:svg="http://www.w3.org/2000/svg" version="1.1">
        <text x="40" font-size="20" text-anchor="middle" fill="blue" font-weight="bold">
            <tspan x="20" dy="20">T</tspan>
            <tspan x="20" dy="20">A</tspan>
            <tspan x="18" dy="20">B</tspan>
        </text>
      </svg>
    `;
    protected override linesY: number[] = [10, 20, 30, 40, 50, 60];

    // TODO: figure out y-coordinates for guitar tab notation
    public getYCoordinate(note: string): number {
      if (!note) {
        return 0;
      }

      return 0;
    }

    protected render(): void {
      this.shadowRoot!.innerHTML = this.build(StaffGuitarTabElement.#TabSvg);
    }
  }

  if (!customElements.get('music-staff-guitar-tab')) {
    customElements.define(
      'music-staff-guitar-tab',
      StaffGuitarTabElement as any
    );
  }
}
