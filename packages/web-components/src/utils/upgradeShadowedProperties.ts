// A property an ancestor writes onto a custom element before that element has
// upgraded (e.g. a <music-measure> redraw reaching an innerHTML-parsed staff
// whose definition hasn't run on it yet) lands as a plain own data property.
// That property shadows the class's accessor for good, so every later write
// bypasses the setter and its re-render. Call from connectedCallback to
// re-route any such value through its setter.
export function upgradeShadowedProperties(element: object): void {
  const record = element as Record<string, unknown>;
  for (const name of Object.keys(element)) {
    let prototype: object | null = Object.getPrototypeOf(element);
    while (prototype !== null) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
      if (descriptor !== undefined) {
        if (descriptor.set !== undefined) {
          const value = record[name];
          delete record[name];
          record[name] = value;
        }
        break;
      }
      prototype = Object.getPrototypeOf(prototype);
    }
  }
}
