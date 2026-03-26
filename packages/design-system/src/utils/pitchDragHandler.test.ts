/**
 * @jest-environment jsdom
 */

import { YCoordinates } from '../types/elements';
import { PitchDragHandler } from './pitchDragHandler';

// jsdom doesn't provide PointerEvent — polyfill it from MouseEvent.
if (typeof globalThis.PointerEvent === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).PointerEvent = class PointerEvent extends MouseEvent {
    readonly pointerId: number;
    readonly pointerType: string;
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
      this.pointerId = init?.pointerId ?? 0;
      this.pointerType = init?.pointerType ?? '';
    }
  };
}

// jsdom doesn't support setPointerCapture/releasePointerCapture.
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = function () {};
  HTMLElement.prototype.releasePointerCapture = function () {};
}

// --- Test Y coordinates (treble clef subset) ---
const yCoordinates: YCoordinates = {
  C6: 10,
  B5: 15,
  A5: 20,
  G5: 25,
  F5: 30,
  E5: 35,
  D5: 40,
  C5: 45,
  B4: 50,
  A4: 55,
  G4: 60,
  F4: 65,
  E4: 70,
  D4: 75,
  C4: 80,
};

// --- Helpers ---

function makeNoteElement(value = 'D', duration = 'quarter'): HTMLElement {
  const el = document.createElement('music-note');
  el.setAttribute('value', value);
  el.setAttribute('duration', duration);
  // Stub shadow DOM with an SVG containing head elements
  const shadow = el.attachShadow({ mode: 'open' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const headHitZone = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'ellipse'
  );
  headHitZone.classList.add('head-hit-zone');
  const head = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'ellipse'
  );
  head.classList.add('head');
  g.appendChild(headHitZone);
  g.appendChild(head);
  svg.appendChild(g);
  shadow.appendChild(svg);

  // jsdom doesn't compute layout
  Object.defineProperty(el, 'nodeName', { value: 'MUSIC-NOTE' });
  return el;
}

function makeChordElement(notes: string[], duration = 'eighth'): HTMLElement {
  const el = document.createElement('music-chord');
  el.setAttribute('duration', duration);
  Object.defineProperty(el, 'nodeName', { value: 'MUSIC-CHORD' });

  for (const n of notes) {
    const noteEl = document.createElement('music-note');
    noteEl.setAttribute('value', n);
    el.appendChild(noteEl);
  }

  // Stub shadow DOM
  const shadow = el.attachShadow({ mode: 'open' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // Create per-note SVGs inside the chord SVG
  for (let i = 0; i < notes.length; i++) {
    const noteSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const headHitZone = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'ellipse'
    );
    headHitZone.classList.add('head-hit-zone');
    const head = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'ellipse'
    );
    head.classList.add('head');
    g.appendChild(headHitZone);
    g.appendChild(head);
    noteSvg.appendChild(g);
    svg.appendChild(noteSvg);
  }
  shadow.appendChild(svg);

  return el;
}

function setup(opts?: { elements?: HTMLElement[] }) {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const elements = opts?.elements ?? [
    makeNoteElement('D'),
    makeNoteElement('F'),
    makeNoteElement('B'),
  ];
  for (const el of elements) {
    host.appendChild(el);
  }

  const livePreviewMock = jest.fn();
  const handler = new PitchDragHandler(host, yCoordinates, livePreviewMock);

  return { host, elements, handler, livePreviewMock };
}

function pointerDown(
  target: Element,
  opts?: Partial<PointerEventInit>
): PointerEvent {
  const e = new PointerEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 50,
    clientY: 75, // D4 y-coordinate
    pointerId: 1,
    ...opts,
  });
  return e;
}

function pointerMove(
  target: Element,
  clientY: number,
  clientX = 50
): PointerEvent {
  const e = new PointerEvent('pointermove', {
    bubbles: true,
    clientX,
    clientY,
    pointerId: 1,
  });
  target.dispatchEvent(e);
  return e;
}

function pointerUp(target: Element): PointerEvent {
  const e = new PointerEvent('pointerup', {
    bubbles: true,
    pointerId: 1,
  });
  target.dispatchEvent(e);
  return e;
}

afterEach(() => {
  document.body.innerHTML = '';
});

// --- Tests ---

describe('PitchDragHandler', () => {
  describe('isNoteheadTarget', () => {
    it('returns true for .head element', () => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'ellipse'
      );
      el.classList.add('head');
      expect(PitchDragHandler.isNoteheadTarget(el)).toBe(true);
    });

    it('returns true for .head-hit-zone element', () => {
      const el = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'ellipse'
      );
      el.classList.add('head-hit-zone');
      expect(PitchDragHandler.isNoteheadTarget(el)).toBe(true);
    });

    it('returns false for a stem element', () => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.classList.add('stem');
      expect(PitchDragHandler.isNoteheadTarget(el)).toBe(false);
    });

    it('returns true for child of .head element', () => {
      const parent = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'g'
      );
      parent.classList.add('head');
      const child = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle'
      );
      parent.appendChild(child);
      expect(PitchDragHandler.isNoteheadTarget(child)).toBe(true);
    });
  });

  describe('tryStart', () => {
    it('starts a pitch drag and returns true for a valid note', () => {
      const { elements, handler } = setup();

      const e = pointerDown(elements[0]);
      const started = handler.tryStart(e, elements[0], 0, null);

      expect(started).toBe(true);
      expect(handler.isDragging).toBe(true);
    });

    it('returns false for a note not in yCoordinates', () => {
      const el = makeNoteElement('X');
      const { handler } = setup({ elements: [el] });

      const e = pointerDown(el);
      const started = handler.tryStart(e, el, 0, null);

      expect(started).toBe(false);
      expect(handler.isDragging).toBe(false);
    });

    it('dispatches cancelable note-pitch-drag-start event', () => {
      const { host, elements, handler } = setup();
      const startHandler = jest.fn();
      host.addEventListener('note-pitch-drag-start', startHandler);

      const e = pointerDown(elements[0]);
      handler.tryStart(e, elements[0], 0, null);

      expect(startHandler).toHaveBeenCalledTimes(1);
      expect(startHandler.mock.calls[0][0].detail.note).toBe('D4');
    });

    it('does not start drag when note-pitch-drag-start is cancelled', () => {
      const { host, elements, handler } = setup();
      host.addEventListener('note-pitch-drag-start', (e) =>
        (e as Event).preventDefault()
      );

      const e = pointerDown(elements[0]);
      const started = handler.tryStart(e, elements[0], 0, null);

      expect(started).toBe(false);
      expect(handler.isDragging).toBe(false);
    });
  });

  describe('pointer move and snap', () => {
    it('calls livePreview with snapped note on vertical drag', () => {
      const { host, elements, handler, livePreviewMock } = setup();

      const e = pointerDown(elements[0], { clientY: 75 }); // D4 = y:75
      handler.tryStart(e, elements[0], 0, null);

      // Move up by 10px (D4=75, should snap to C5=45 if we move up 30)
      pointerMove(host, 45);

      expect(livePreviewMock).toHaveBeenCalled();
      const lastCall =
        livePreviewMock.mock.calls[livePreviewMock.mock.calls.length - 1];
      expect(lastCall[0]).toBe(0); // elementIndex
      expect(lastCall[2]).toBe(null); // chordNoteIndex
      // The new note should be a higher pitch than D4
      expect(lastCall[1]).not.toBe('D4');
    });

    it('does not call livePreview when staying at same pitch', () => {
      const { host, elements, handler, livePreviewMock } = setup();

      const e = pointerDown(elements[0], { clientY: 75 }); // D4
      handler.tryStart(e, elements[0], 0, null);

      // Move slightly — not enough to change snap position
      pointerMove(host, 76);

      expect(livePreviewMock).not.toHaveBeenCalled();
    });
  });

  describe('pointer up dispatches note-pitch-change', () => {
    it('dispatches note-pitch-change when pitch changed', () => {
      const { host, elements, handler } = setup();
      const changeHandler = jest.fn();
      host.addEventListener('note-pitch-change', changeHandler);

      const e = pointerDown(elements[0], { clientY: 75 }); // D4
      handler.tryStart(e, elements[0], 0, null);
      pointerMove(host, 45); // move up to ~C5
      pointerUp(host);

      expect(changeHandler).toHaveBeenCalledTimes(1);
      const detail = changeHandler.mock.calls[0][0].detail;
      expect(detail.fromNote).toBe('D4');
      expect(detail.toNote).not.toBe('D4');
      expect(detail.elementIndex).toBe(0);
      expect(detail.chordNoteIndex).toBe(null);
    });

    it('does not dispatch note-pitch-change when pitch unchanged', () => {
      const { host, elements, handler } = setup();
      const changeHandler = jest.fn();
      host.addEventListener('note-pitch-change', changeHandler);

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);
      pointerUp(host);

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  describe('escape cancels drag', () => {
    it('restores original note via livePreview on Escape', () => {
      const { host, elements, handler, livePreviewMock } = setup();

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);
      pointerMove(host, 45); // change pitch

      livePreviewMock.mockClear();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      // Should restore original note
      expect(livePreviewMock).toHaveBeenCalledWith(0, 'D4', null);
      expect(handler.isDragging).toBe(false);
    });

    it('removes tooltip on Escape', () => {
      const { elements, handler } = setup();
      const bodyChildrenBefore = document.body.children.length;

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);
      // Tooltip added
      expect(document.body.children.length).toBe(bodyChildrenBefore + 1);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(document.body.children.length).toBe(bodyChildrenBefore);
    });
  });

  describe('cancelDrag', () => {
    it('is safe to call when no drag is active', () => {
      const { handler } = setup();
      expect(() => handler.cancelDrag()).not.toThrow();
    });

    it('restores original pitch on cancel', () => {
      const { host, elements, handler, livePreviewMock } = setup();

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);
      pointerMove(host, 45);

      livePreviewMock.mockClear();
      handler.cancelDrag();

      expect(livePreviewMock).toHaveBeenCalledWith(0, 'D4', null);
    });
  });

  describe('detach', () => {
    it('cancels in-progress drag on detach', () => {
      const { elements, handler } = setup();

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);
      expect(handler.isDragging).toBe(true);

      handler.detach();

      expect(handler.isDragging).toBe(false);
    });
  });

  describe('tooltip', () => {
    it('creates a tooltip on drag start', () => {
      const { elements, handler } = setup();
      const bodyChildrenBefore = document.body.children.length;

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);

      expect(document.body.children.length).toBe(bodyChildrenBefore + 1);
      const tooltip = document.body.lastElementChild as HTMLElement;
      expect(tooltip.style.position).toBe('fixed');
      expect(tooltip.textContent).toBe('D4');
    });

    it('updates tooltip text when pitch changes', () => {
      const { host, elements, handler } = setup();

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);

      pointerMove(host, 45); // move to higher pitch

      const tooltip = document.body.lastElementChild as HTMLElement;
      expect(tooltip.textContent).toContain('→');
      expect(tooltip.textContent).toContain('D4');
    });

    it('removes tooltip after drop', () => {
      const { host, elements, handler } = setup();
      const bodyChildrenBefore = document.body.children.length;

      const e = pointerDown(elements[0], { clientY: 75 });
      handler.tryStart(e, elements[0], 0, null);
      pointerUp(host);

      expect(document.body.children.length).toBe(bodyChildrenBefore);
    });
  });

  describe('chord support', () => {
    it('starts pitch drag for a specific chord note', () => {
      const chord = makeChordElement(['A', 'E']);
      const { host, handler } = setup({ elements: [chord] });
      const startHandler = jest.fn();
      host.addEventListener('note-pitch-drag-start', startHandler);

      const e = pointerDown(chord, { clientY: 55 }); // A4 = y:55
      const started = handler.tryStart(e, chord, 0, 0);

      expect(started).toBe(true);
      expect(startHandler.mock.calls[0][0].detail.chordNoteIndex).toBe(0);
    });

    it('prevents snapping to a pitch already occupied by another chord note', () => {
      // Chord with A and E. Dragging E should not snap to A.
      const chord = makeChordElement(['A', 'E']);
      const { host, handler, livePreviewMock } = setup({
        elements: [chord],
      });

      const e = pointerDown(chord, { clientY: 70 }); // E4 = y:70
      handler.tryStart(e, chord, 0, 1); // dragging note index 1 (E)

      // Move to A4's Y position (55)
      pointerMove(host, 55);

      // The handler should skip A4 since it's occupied by chord note 0
      // and snap to the nearest non-occupied position instead
      if (livePreviewMock.mock.calls.length > 0) {
        const lastNote =
          livePreviewMock.mock.calls[livePreviewMock.mock.calls.length - 1][1];
        expect(lastNote).not.toBe('A4');
      }
    });
  });
});
