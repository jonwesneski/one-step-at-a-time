type DurationType = "sixteenth" | "eighth" | "quarter" | "half" | "whole";

const durationToTailCountMap = new Map<DurationType, number>();
durationToTailCountMap.set("sixteenth", 2);
durationToTailCountMap.set("eighth", 1);

interface INoteProps {
  x: number;
  duration: DurationType;
}
export default function Note(props: INoteProps) {
  const stemStart = 10;
  const stemLength = 25;
  const stemEnd = stemStart + stemLength;
  const headFill =
    props.duration === "half" || props.duration === "whole" ? "none" : "blue";

  return (
    <g id="note">
      {/* Tail for note */}
      {Array.from(
        { length: durationToTailCountMap.get(props.duration) ?? 0 },
        (_, index) => {
          const y = stemEnd - 5 * index;
          return (
            <path
              key={index}
              d={`M ${props.x} ${y} Q ${props.x + 8} ${y - 2} ${props.x + 6} ${
                y + 5
              }`}
              fill="blue"
              stroke="none"
            />
          );
        }
      )}
      {/* Stem of note */}
      {props.duration !== "whole" ? (
        <line
          x1={props.x}
          y1={stemStart}
          x2={props.x}
          y2={stemEnd}
          style={{ stroke: "blue", strokeWidth: 1 }}
        />
      ) : null}
      {/* Head of note */}
      <ellipse
        cx={props.x + 3}
        cy={stemStart}
        rx="4"
        ry="3"
        transform={`rotate(-20 ${props.x + 3} ${stemStart})`}
        style={{
          stroke: "blue",
          fill: headFill,
          strokeWidth: 2,
        }}
      />
    </g>
  );
}
