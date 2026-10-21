/**
 * @jest-environment jsdom
 */
import { VerticalSpaceReservations } from './verticalSpace';

afterEach(() => {
  document.body.innerHTML = '';
});

const makeHost = () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return { host, reservations: new VerticalSpaceReservations(host) };
};

describe('VerticalSpaceReservations', () => {
  it('uses the larger reservation per side across sources', () => {
    const { host, reservations } = makeHost();
    reservations.reserve('first', { top: 50, bottom: 5 });
    reservations.reserve('second', { top: 20, bottom: 12 });

    expect(host.style.marginTop).toBe('50px');
    expect(host.style.marginBottom).toBe('12px');
  });

  it("replaces a source's previous reservation rather than keeping its past maximum", () => {
    const { host, reservations } = makeHost();
    reservations.reserve('slurs', { top: 50, bottom: 0 });
    reservations.reserve('slurs', { top: 30, bottom: 0 });

    expect(host.style.marginTop).toBe('30px');
  });

  it("falls back to another source's value once it becomes the larger one", () => {
    const { host, reservations } = makeHost();
    reservations.reserve('slurs', { top: 50, bottom: 0 });
    reservations.reserve('tuplets', { top: 40, bottom: 0 });
    reservations.reserve('slurs', { top: 10, bottom: 0 });

    expect(host.style.marginTop).toBe('40px');
  });

  it('treats a zero band as a release', () => {
    const { host, reservations } = makeHost();
    reservations.reserve('slurs', { top: 50, bottom: 0 });
    reservations.reserve('tuplets', { top: 20, bottom: 0 });
    reservations.reserve('slurs', { top: 0, bottom: 0 });

    expect(host.style.marginTop).toBe('20px');
  });

  it('clears the margin once every source is released', () => {
    const { host, reservations } = makeHost();
    reservations.reserve('slurs', { top: 50, bottom: 8 });
    reservations.reserve('tuplets', { top: 20, bottom: 0 });
    reservations.release('slurs');
    reservations.release('tuplets');

    expect(host.style.marginTop).toBe('');
    expect(host.style.marginBottom).toBe('');
  });

  it('reports whether the margin changed', () => {
    const { reservations } = makeHost();
    expect(reservations.reserve('slurs', { top: 50, bottom: 0 })).toBe(true);
    expect(reservations.reserve('slurs', { top: 50, bottom: 0 })).toBe(false);
    // A smaller second source leaves the margin as it was.
    expect(reservations.reserve('tuplets', { top: 10, bottom: 0 })).toBe(false);
    expect(reservations.release('slurs')).toBe(true);
  });
});
