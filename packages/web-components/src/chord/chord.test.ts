/**
 * @jest-environment jsdom
 */
import '../note/index';
import { DurationType, Note } from '../types/theory';
import './index';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('music-chord', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('music-chord')).toBeDefined();
  });

  it('renders shadow root with default duration', () => {
    const el = document.createElement('music-chord') as any;
    document.body.appendChild(el);

    expect(el.duration).toBe('quarter');
    expect(el.shadowRoot).not.toBeNull();
    expect(el.shadowRoot.innerHTML).not.toBe('');
  });

  describe('notes getter', () => {
    it('returns empty array when no chord attribute and no child notes', () => {
      const el = document.createElement('music-chord') as any;
      document.body.appendChild(el);

      expect(el.notes).toEqual([]);
    });

    it('returns notes derived from chord attribute when no child notes exist', () => {
      const el = document.createElement('music-chord') as any;
      el.setAttribute('chord', 'Amaj');
      el.setAttribute('duration', 'quarter');
      document.body.appendChild(el);

      const notes = el.notes;
      const values: Note[] = notes.map((n: { value: Note }) => n.value);
      expect(values).toEqual(['A', 'C#', 'E']);
      notes.forEach((n: { octave: null; duration: DurationType }) => {
        expect(n.octave).toBeNull();
        expect(n.duration).toBe('quarter');
      });
    });

    it('returns child music-note elements when they exist, ignoring chord attribute', () => {
      const el = document.createElement('music-chord') as any;
      el.setAttribute('chord', 'Amaj');
      document.body.appendChild(el);

      const noteC = document.createElement('music-note') as any;
      noteC.setAttribute('note', 'C');
      noteC.setAttribute('duration', 'quarter');
      const noteE = document.createElement('music-note') as any;
      noteE.setAttribute('note', 'E');
      noteE.setAttribute('duration', 'quarter');
      el.appendChild(noteC);
      el.appendChild(noteE);

      const values: Note[] = el.notes.map((n: { value: Note }) => n.value);
      expect(values).toEqual(['C', 'E']);
    });
  });
});
