import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "music-measure": {
        lineCount?: 5 | 6;
        children?: Element[];
      };
      "music-note": {
        x?: string | number;
        duration?: "sixteenth" | "eighth" | "quarter" | "half" | "whole";
        class?: string;
      };
    }
  }
}
