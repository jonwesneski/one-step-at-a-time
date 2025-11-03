import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "music-layer": {
        lineCount?: 5 | 6;
        children?: React.ReactNode;
      };
      "music-measure": {
        currentCount?: number;
        children?: React.ReactNode;
      };
      "music-note": {
        x?: string | number;
        duration?: "sixteenth" | "eighth" | "quarter" | "half" | "whole";
        class?: string;
      };
    }
  }
}
