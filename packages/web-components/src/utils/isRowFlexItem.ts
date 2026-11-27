/** Whether an element's flex basis is its width. */
export function isRowFlexItem(element: HTMLElement): boolean {
  const parent = element.parentElement;
  if (parent === null) {
    return false;
  }
  const { display, flexDirection } = getComputedStyle(parent);
  return display.includes('flex') && !flexDirection.startsWith('column');
}
