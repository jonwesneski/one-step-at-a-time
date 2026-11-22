// `HTMLElement`, or an empty class where it doesn't exist (SSR/Node), so an
// element class can be declared and exported at module scope.
export const MaybeHTMLElement: typeof HTMLElement =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.HTMLElement === 'function'
    ? globalThis.HTMLElement
    : (class {} as unknown as typeof HTMLElement);
