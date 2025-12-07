// This module exists so that `import './custom-elements'` resolves.
// It centralizes registration imports for the design-system package.

// Import each element implementation so they register themselves when
// the package is imported (their modules already guard with
// `typeof window !== 'undefined'`).
import './chord';
import './measure';
import './staff-treble'; // order of import matters for some reason, otherwise <note> can't find gYCoordinate()

import './note';

export {};
