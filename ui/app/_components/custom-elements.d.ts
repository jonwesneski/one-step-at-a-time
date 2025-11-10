import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "music-layer": {
        lineCount?: 5 | 6 | "5" | "6";
        children?: React.ReactNode;
      };
      "music-measure": {
        currentCount?: number | string;
        children?: React.ReactNode;
      };
      "music-chord": {};
      "music-note": {
        x?: number | string;
        duration?: "sixteenth" | "eighth" | "quarter" | "half" | "whole";
        class?: string;
      };
    }
  }
}
