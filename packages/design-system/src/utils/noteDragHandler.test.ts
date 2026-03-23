/**
 * @jest-environment jsdom
 */

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

// jsdom doesn't support setPointerCapture/releasePointerCapture on SVG elements.
if (!SVGElement.prototype.setPointerCapture) {
  SVGElement.prototype.setPointerCapture = function () {};
  SVGElement.prototype.releasePointerCapture = function () {};
}

import '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

function makeStaff(editable = true): any {
  const el = document.createElement('music-staff-treble') as any;
  el.setAttribute('keySig', 'C');
  el.setAttribute('mode', 'major');
  el.setAttribute('time', '4/4');
  if (editable) el.setAttribute('editable', '');
  document.body.appendChild(el);
  return el;
}

function makeNote(value: string, duration = 'quarter'): any {
  const note = document.createElement('music-note') as any;
  note.setAttribute('duration', duration);
  note.setAttribute('value', value);
  return note;
}

function triggerSlotChange(staff: any, notes: any[]) {
  const slot = staff.shadowRoot.querySelector('slot');
  slot.assignedElements = () => notes;
  slot.dispatchEvent(new Event('slotchange'));
}

function getNoteSvgs(staff: any): SVGElement[] {
  return [
    ...staff.shadowRoot.querySelectorAll(
      '.notes-container > [data-slot-index]'
    ),
  ] as SVGElement[];
}

describe('drag-and-drop', () => {
  describe('data-slot-index tagging', () => {
    it('tags rendered note SVGs with data-slot-index', () => {
      const staff = makeStaff(false);
      const notes = [makeNote('C4'), makeNote('E4'), makeNote('G4')];
      triggerSlotChange(staff, notes);

      const svgs = getNoteSvgs(staff);
      expect(svgs).toHaveLength(3);
      expect(svgs[0].dataset.slotIndex).toBe('0');
      expect(svgs[1].dataset.slotIndex).toBe('1');
      expect(svgs[2].dataset.slotIndex).toBe('2');
    });

    it('tags chord SVGs with data-slot-index', () => {
      const staff = makeStaff(false);
      const chord = document.createElement('music-chord') as any;
      chord.setAttribute('duration', 'quarter');
      const n1 = makeNote('C4');
      const n2 = makeNote('E4');
      chord.appendChild(n1);
      chord.appendChild(n2);
      // Mock the notes property for the chord
      Object.defineProperty(chord, 'notes', {
        get: () => [
          { value: 'C4', duration: 'quarter' },
          { value: 'E4', duration: 'quarter' },
        ],
      });

      triggerSlotChange(staff, [makeNote('G4'), chord]);

      const svgs = getNoteSvgs(staff);
      expect(svgs).toHaveLength(2);
      expect(svgs[0].dataset.slotIndex).toBe('0');
      expect(svgs[1].dataset.slotIndex).toBe('1');
    });
  });

  describe('editable attribute', () => {
    it('sets pointer-events auto on notes container when editable', () => {
      const staff = makeStaff(true);
      triggerSlotChange(staff, [makeNote('C4'), makeNote('E4')]);

      const notesContainer = staff.shadowRoot.querySelector('.notes-container');
      expect(notesContainer.style.pointerEvents).toBe('auto');
    });

    it('does not set pointer-events when not editable', () => {
      const staff = makeStaff(false);
      triggerSlotChange(staff, [makeNote('C4'), makeNote('E4')]);

      const notesContainer = staff.shadowRoot.querySelector('.notes-container');
      expect(notesContainer.style.pointerEvents).not.toBe('auto');
    });

    it('enables drag when editable is toggled on', () => {
      const staff = makeStaff(false);
      triggerSlotChange(staff, [makeNote('C4'), makeNote('E4')]);

      const notesContainer = staff.shadowRoot.querySelector('.notes-container');
      expect(notesContainer.style.pointerEvents).not.toBe('auto');

      staff.setAttribute('editable', '');

      expect(notesContainer.style.pointerEvents).toBe('auto');
    });

    it('disables drag when editable is removed', () => {
      const staff = makeStaff(true);
      triggerSlotChange(staff, [makeNote('C4'), makeNote('E4')]);

      const notesContainer = staff.shadowRoot.querySelector('.notes-container');
      expect(notesContainer.style.pointerEvents).toBe('auto');

      staff.removeAttribute('editable');

      expect(notesContainer.style.pointerEvents).toBe('');
    });
  });

  describe('note-drag-start event', () => {
    it('dispatches note-drag-start on pointerdown on a note SVG', () => {
      const staff = makeStaff(true);
      const notes = [makeNote('C4'), makeNote('E4')];
      triggerSlotChange(staff, notes);

      const svgs = getNoteSvgs(staff);
      const dragStartHandler = jest.fn();
      staff.addEventListener('note-drag-start', dragStartHandler);

      const pointerDown = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 50,
        clientY: 50,
      });
      svgs[0].dispatchEvent(pointerDown);

      expect(dragStartHandler).toHaveBeenCalledTimes(1);
      expect(dragStartHandler.mock.calls[0][0].detail.index).toBe(0);
    });

    it('can cancel drag via preventDefault on note-drag-start', () => {
      const staff = makeStaff(true);
      const notes = [makeNote('C4'), makeNote('E4')];
      triggerSlotChange(staff, notes);

      const svgs = getNoteSvgs(staff);
      staff.addEventListener('note-drag-start', (e: Event) =>
        e.preventDefault()
      );

      const pointerDown = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 50,
        clientY: 50,
      });
      svgs[0].dispatchEvent(pointerDown);

      // Original should not be dimmed (drag was cancelled)
      expect(svgs[0].style.opacity).not.toBe('0.3');
    });

    it('does not start drag on right click', () => {
      const staff = makeStaff(true);
      const notes = [makeNote('C4'), makeNote('E4')];
      triggerSlotChange(staff, notes);

      const svgs = getNoteSvgs(staff);
      const dragStartHandler = jest.fn();
      staff.addEventListener('note-drag-start', dragStartHandler);

      const pointerDown = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 2,
        clientX: 50,
        clientY: 50,
      });
      svgs[0].dispatchEvent(pointerDown);

      expect(dragStartHandler).not.toHaveBeenCalled();
    });
  });

  describe('drag visual feedback', () => {
    it('dims the source SVG on drag start', () => {
      const staff = makeStaff(true);
      const notes = [makeNote('C4'), makeNote('E4')];
      triggerSlotChange(staff, notes);

      const svgs = getNoteSvgs(staff);
      const pointerDown = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 50,
        clientY: 50,
      });
      svgs[0].dispatchEvent(pointerDown);

      expect(svgs[0].style.opacity).toBe('0.3');
    });

    it('creates a clone SVG during drag', () => {
      const staff = makeStaff(true);
      const notes = [makeNote('C4'), makeNote('E4')];
      triggerSlotChange(staff, notes);

      const notesContainer = staff.shadowRoot.querySelector('.notes-container');
      const svgs = getNoteSvgs(staff);
      const childCountBefore = notesContainer.children.length;

      const pointerDown = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 50,
        clientY: 50,
      });
      svgs[0].dispatchEvent(pointerDown);

      // Clone + drop indicator = 2 extra children
      expect(notesContainer.children.length).toBe(childCountBefore + 2);
    });
  });

  describe('escape cancels drag', () => {
    it('restores opacity and removes clone on Escape', () => {
      const staff = makeStaff(true);
      const notes = [makeNote('C4'), makeNote('E4')];
      triggerSlotChange(staff, notes);

      const svgs = getNoteSvgs(staff);
      const notesContainer = staff.shadowRoot.querySelector('.notes-container');

      const pointerDown = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 50,
        clientY: 50,
      });
      svgs[0].dispatchEvent(pointerDown);

      expect(svgs[0].style.opacity).toBe('0.3');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(svgs[0].style.opacity).toBe('');
    });
  });

  describe('single note', () => {
    it('does not start drag when only one note exists', () => {
      const staff = makeStaff(true);
      triggerSlotChange(staff, [makeNote('C4')]);

      const svgs = getNoteSvgs(staff);
      const dragStartHandler = jest.fn();
      staff.addEventListener('note-drag-start', dragStartHandler);

      const pointerDown = new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        clientX: 50,
        clientY: 50,
      });
      svgs[0].dispatchEvent(pointerDown);

      expect(dragStartHandler).not.toHaveBeenCalled();
    });
  });
});
