/**
 * @jest-environment jsdom
 */
import { upgradeShadowedProperties } from './upgradeShadowedProperties';

const TAG = 'upgrade-shadowed-properties-test';

describe('upgradeShadowedProperties', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('routes a value written before upgrade, and every later write, through the setter', () => {
    const element = document.createElement(TAG) as HTMLElement & {
      value: number | null;
    };
    element.value = 5;

    const received: (number | null)[] = [];
    class TestElement extends HTMLElement {
      #value: number | null = null;
      get value(): number | null {
        return this.#value;
      }
      set value(next: number | null) {
        received.push(next);
        this.#value = next;
      }
      connectedCallback(): void {
        upgradeShadowedProperties(this);
      }
    }
    customElements.define(TAG, TestElement);
    document.body.appendChild(element);

    expect(Object.prototype.hasOwnProperty.call(element, 'value')).toBe(false);
    element.value = 7;
    expect(received).toEqual([5, 7]);
    expect(element.value).toBe(7);
  });
});
