// This module exists so that `import './custom-elements'` resolves.
// It centralizes registration imports for the design-system package.

// Import each element implementation so they register themselves when
// the package is imported (their modules already guard with
// `typeof window !== 'undefined'`).
import './chord';
import './layer';
import './measure';
import './note';

// Keep the module as an ES module.
export {};
