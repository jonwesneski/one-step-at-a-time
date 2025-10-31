interface INoteProps {
  x: number;
  duration: "sixteenth" | "eigth" | "quarter" | "half" | "whole";
}
export default function Note(props: INoteProps) {
  return (
    <g id="note">
      <line
        x1={props.x}
        y1="10"
        x2={props.x}
        y2="30"
        style={{ stroke: "blue", strokeWidth: 1 }}
      />
      <ellipse
        cx={props.x + 3}
        cy="10"
        rx="4"
        ry="3"
        transform={`rotate(-20 ${props.x} 10)`}
        style={{ stroke: "blue", fill: "blue", strokeWidth: 1 }}
      />
    </g>
  );
}
