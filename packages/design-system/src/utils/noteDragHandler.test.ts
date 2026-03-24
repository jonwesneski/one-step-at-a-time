/**
 * @jest-environment jsdom
 */

import { NoteDragHandler } from './noteDragHandler';

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

// --- Helpers ---

/** Create a mock note element with a shadow root containing an SVG. */
function makeNoteElement(left = '0px'): HTMLElement {
  const el = document.createElement('div');
  const shadow = el.attachShadow({ mode: 'open' });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '32');
  svg.setAttribute('height', '60');
  shadow.appendChild(svg);
  el.style.left = left;
  // jsdom doesn't compute layout, so stub getBoundingClientRect
  el.getBoundingClientRect = () => ({
    left: parseFloat(left),
    top: 0,
    right: parseFloat(left) + 32,
    bottom: 60,
    width: 32,
    height: 60,
    x: parseFloat(left),
    y: 0,
    toJSON: () => '',
  });
  return el;
}

/** Scaffold: host element, wrapper, elements array, and handler. */
function setup(opts?: { managed?: boolean; elementCount?: number }) {
  const managed = opts?.managed ?? false;
  const count = opts?.elementCount ?? 3;

  const host = document.createElement('div');
  const wrapper = document.createElement('div');
  host.appendChild(wrapper);
  document.body.appendChild(host);

  const elements: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const el = makeNoteElement(`${i * 50}px`);
    wrapper.appendChild(el);
    elements.push(el);
  }

  const handler = new NoteDragHandler(host, wrapper, () => elements, managed);
  handler.attach();

  return { host, wrapper, elements, handler };
}

function pointerDown(
  target: Element,
  opts?: Partial<PointerEventInit>
): PointerEvent {
  const e = new PointerEvent('pointerdown', {
    bubbles: true,
    button: 0,
    clientX: 50,
    clientY: 30,
    pointerId: 1,
    ...opts,
  });
  target.dispatchEvent(e);
  return e;
}

function pointerMove(
  target: Element,
  clientX: number,
  clientY = 30
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

describe('NoteDragHandler', () => {
  describe('drag start', () => {
    it('dispatches note-drag-start on pointerdown on a slotted element', () => {
      const { host, elements } = setup();
      const dragStartHandler = jest.fn();
      host.addEventListener('note-drag-start', dragStartHandler);

      pointerDown(elements[0]);

      expect(dragStartHandler).toHaveBeenCalledTimes(1);
      expect(dragStartHandler.mock.calls[0][0].detail.index).toBe(0);
      expect(dragStartHandler.mock.calls[0][0].detail.element).toBe(
        elements[0]
      );
    });

    it('dispatches note-drag-start for the second element', () => {
      const { host, elements } = setup();
      const dragStartHandler = jest.fn();
      host.addEventListener('note-drag-start', dragStartHandler);

      // Click on the second element with clientX within its bounds
      pointerDown(elements[1], { clientX: 60 });

      expect(dragStartHandler).toHaveBeenCalledTimes(1);
      expect(dragStartHandler.mock.calls[0][0].detail.index).toBe(1);
    });

    it('does not start drag on right click', () => {
      const { host, elements } = setup();
      const dragStartHandler = jest.fn();
      host.addEventListener('note-drag-start', dragStartHandler);

      pointerDown(elements[0], { button: 2 });

      expect(dragStartHandler).not.toHaveBeenCalled();
    });

    it('does not start drag when only one element exists', () => {
      const { host, elements } = setup({ elementCount: 1 });
      const dragStartHandler = jest.fn();
      host.addEventListener('note-drag-start', dragStartHandler);

      pointerDown(elements[0]);

      expect(dragStartHandler).not.toHaveBeenCalled();
    });

    it('can cancel drag via preventDefault on note-drag-start', () => {
      const { host, elements } = setup();
      host.addEventListener('note-drag-start', (e) =>
        (e as Event).preventDefault()
      );

      pointerDown(elements[0]);

      // Original should not be dimmed (drag was cancelled)
      expect(elements[0].style.opacity).not.toBe('0.3');
    });

    it('does not start drag for a click outside slotted elements', () => {
      const { host, wrapper } = setup();
      const dragStartHandler = jest.fn();
      host.addEventListener('note-drag-start', dragStartHandler);

      // Click on the wrapper itself, not a child
      pointerDown(wrapper);

      expect(dragStartHandler).not.toHaveBeenCalled();
    });
  });

  describe('visual feedback', () => {
    it('dims the source element on drag start', () => {
      const { elements } = setup();

      pointerDown(elements[0]);

      expect(elements[0].style.opacity).toBe('0.3');
    });

    it('creates a clone in document.body during drag', () => {
      const { elements } = setup();
      const bodyChildrenBefore = document.body.children.length;

      pointerDown(elements[0]);

      // Clone appended to body
      expect(document.body.children.length).toBe(bodyChildrenBefore + 1);
      const clone = document.body.lastElementChild as HTMLElement;
      expect(clone.style.position).toBe('fixed');
      expect(clone.style.opacity).toBe('0.7');
    });

    it('appends drop indicator to wrapper on drag start', () => {
      const { wrapper, elements } = setup();
      const wrapperChildrenBefore = wrapper.children.length;

      pointerDown(elements[0]);

      // Drop indicator appended to wrapper
      expect(wrapper.children.length).toBe(wrapperChildrenBefore + 1);
    });

    it('moves the clone to follow the pointer on pointermove', () => {
      const { host, elements } = setup();

      pointerDown(elements[0], { clientX: 10, clientY: 10 });

      const clone = document.body.lastElementChild as HTMLElement;

      pointerMove(host, 80, 20);

      // Clone should have moved (exact values depend on offset calculation)
      const cloneLeft = parseFloat(clone.style.left);
      expect(cloneLeft).toBeGreaterThan(0);
    });
  });

  describe('escape cancels drag', () => {
    it('restores opacity on Escape', () => {
      const { elements } = setup();

      pointerDown(elements[0]);
      expect(elements[0].style.opacity).toBe('0.3');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(elements[0].style.opacity).toBe('');
    });

    it('removes clone from body on Escape', () => {
      const { elements } = setup();
      const bodyChildrenBefore = document.body.children.length;

      pointerDown(elements[0]);
      expect(document.body.children.length).toBe(bodyChildrenBefore + 1);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(document.body.children.length).toBe(bodyChildrenBefore);
    });

    it('removes drop indicator from wrapper on Escape', () => {
      const { wrapper, elements } = setup();
      const wrapperChildrenBefore = wrapper.children.length;

      pointerDown(elements[0]);
      expect(wrapper.children.length).toBe(wrapperChildrenBefore + 1);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(wrapper.children.length).toBe(wrapperChildrenBefore);
    });

    it('does not dispatch note-reorder on Escape', () => {
      const { host, elements } = setup();
      const reorderHandler = jest.fn();
      host.addEventListener('note-reorder', reorderHandler);

      pointerDown(elements[0]);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(reorderHandler).not.toHaveBeenCalled();
    });
  });

  describe('pointer cancel', () => {
    it('cleans up on pointercancel', () => {
      const { host, elements } = setup();

      pointerDown(elements[0]);
      expect(elements[0].style.opacity).toBe('0.3');

      host.dispatchEvent(
        new PointerEvent('pointercancel', { bubbles: true, pointerId: 1 })
      );

      expect(elements[0].style.opacity).toBe('');
    });
  });

  describe('note-drag-end event', () => {
    it('dispatches note-drag-end on pointerup even without movement', () => {
      const { host, elements } = setup();
      const dragEndHandler = jest.fn();
      host.addEventListener('note-drag-end', dragEndHandler);

      pointerDown(elements[0]);
      pointerUp(host);

      expect(dragEndHandler).toHaveBeenCalledTimes(1);
    });

    it('includes fromIndex and toIndex in note-drag-end detail', () => {
      const { host, elements } = setup();
      const dragEndHandler = jest.fn();
      host.addEventListener('note-drag-end', dragEndHandler);

      pointerDown(elements[0]);
      pointerUp(host);

      const detail = dragEndHandler.mock.calls[0][0].detail;
      expect(detail).toHaveProperty('fromIndex');
      expect(detail).toHaveProperty('toIndex');
    });
  });

  describe('note-reorder event', () => {
    it('dispatches note-reorder when drop index differs from source', () => {
      const { host, elements } = setup();
      const reorderHandler = jest.fn();
      host.addEventListener('note-reorder', reorderHandler);

      // Drag element 0 far to the right (past all elements)
      pointerDown(elements[0], { clientX: 5 });
      pointerMove(host, 200);
      pointerUp(host);

      expect(reorderHandler).toHaveBeenCalledTimes(1);
      const detail = reorderHandler.mock.calls[0][0].detail;
      expect(detail.fromIndex).toBe(0);
      expect(detail.toIndex).toBeGreaterThan(1);
    });

    it('does not dispatch note-reorder when dropped at same position', () => {
      const { host, elements } = setup();
      const reorderHandler = jest.fn();
      host.addEventListener('note-reorder', reorderHandler);

      // Drag element 0 but stay in place
      pointerDown(elements[0], { clientX: 5 });
      pointerMove(host, 5);
      pointerUp(host);

      expect(reorderHandler).not.toHaveBeenCalled();
    });

    it('does not dispatch note-reorder at sourceIndex + 1 (no-op)', () => {
      const { host, elements } = setup();
      const reorderHandler = jest.fn();
      host.addEventListener('note-reorder', reorderHandler);

      // Drag element 0 just slightly right (into position 1 which is no-op)
      pointerDown(elements[0], { clientX: 5 });
      pointerMove(host, 30); // midpoint of element 0 is at 16, so this is past it but before element 1's midpoint at 66
      pointerUp(host);

      expect(reorderHandler).not.toHaveBeenCalled();
    });
  });

  describe('unmanaged mode (DOM reordering)', () => {
    it('reorders light DOM elements on drop', () => {
      const { host, elements } = setup({ managed: false });

      // Verify initial order
      const parent = elements[0].parentElement!;
      expect([...parent.children].indexOf(elements[0])).toBe(0);

      // Drag element 0 past all others
      pointerDown(elements[0], { clientX: 5 });
      pointerMove(host, 200);
      pointerUp(host);

      // Element 0 should now be last among the note elements
      const children = [...parent.children].filter((c) =>
        elements.includes(c as HTMLElement)
      );
      expect(children[children.length - 1]).toBe(elements[0]);
    });
  });

  describe('managed mode (no DOM reordering)', () => {
    it('does not reorder light DOM in managed mode', () => {
      const { host, elements } = setup({ managed: true });

      const parent = elements[0].parentElement!;
      const initialOrder = [...parent.children];

      // Drag element 0 past all others
      pointerDown(elements[0], { clientX: 5 });
      pointerMove(host, 200);
      pointerUp(host);

      // DOM order should be unchanged
      expect([...parent.children]).toEqual(initialOrder);
    });

    it('still dispatches note-reorder in managed mode', () => {
      const { host, elements } = setup({ managed: true });
      const reorderHandler = jest.fn();
      host.addEventListener('note-reorder', reorderHandler);

      pointerDown(elements[0], { clientX: 5 });
      pointerMove(host, 200);
      pointerUp(host);

      expect(reorderHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup after drop', () => {
    it('restores opacity after drop', () => {
      const { host, elements } = setup();

      pointerDown(elements[0]);
      pointerUp(host);

      expect(elements[0].style.opacity).toBe('');
    });

    it('removes clone after drop', () => {
      const { host, elements } = setup();
      const bodyChildrenBefore = document.body.children.length;

      pointerDown(elements[0]);
      expect(document.body.children.length).toBe(bodyChildrenBefore + 1);

      pointerUp(host);

      expect(document.body.children.length).toBe(bodyChildrenBefore);
    });

    it('removes drop indicator after drop', () => {
      const { host, wrapper, elements } = setup();
      const wrapperChildrenBefore = wrapper.children.length;

      pointerDown(elements[0]);
      pointerUp(host);

      expect(wrapper.children.length).toBe(wrapperChildrenBefore);
    });
  });

  describe('detach', () => {
    it('stops listening for pointerdown after detach', () => {
      const { host, elements, handler } = setup();
      const dragStartHandler = jest.fn();
      host.addEventListener('note-drag-start', dragStartHandler);

      handler.detach();

      pointerDown(elements[0]);

      expect(dragStartHandler).not.toHaveBeenCalled();
    });

    it('cancels in-progress drag on detach', () => {
      const { elements, handler } = setup();

      pointerDown(elements[0]);
      expect(elements[0].style.opacity).toBe('0.3');

      handler.detach();

      expect(elements[0].style.opacity).toBe('');
    });
  });

  describe('cancelDrag', () => {
    it('is safe to call when no drag is active', () => {
      const { handler } = setup();

      expect(() => handler.cancelDrag()).not.toThrow();
    });

    it('cleans up an active drag', () => {
      const { elements, handler } = setup();

      pointerDown(elements[0]);
      expect(elements[0].style.opacity).toBe('0.3');

      handler.cancelDrag();

      expect(elements[0].style.opacity).toBe('');
    });
  });

  describe('findSlottedElement traversal', () => {
    it('finds target when pointerdown is on a child of a slotted element', () => {
      const { host, elements } = setup();
      const dragStartHandler = jest.fn();
      host.addEventListener('note-drag-start', dragStartHandler);

      // Add a light DOM child inside elements[1] and click on it.
      // The handler should walk up to find the slotted element.
      const innerChild = document.createElement('span');
      elements[1].appendChild(innerChild);
      pointerDown(innerChild, { clientX: 60 });

      expect(dragStartHandler).toHaveBeenCalledTimes(1);
      expect(dragStartHandler.mock.calls[0][0].detail.element).toBe(
        elements[1]
      );
    });
  });
});
