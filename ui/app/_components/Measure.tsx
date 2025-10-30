interface IMeasureProps {}
export default function Home(props: IMeasureProps) {
  return (
    <svg
      className="w-1/3 min-w-[300px]"
      height="100"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
    >
      <line
        x1="0"
        y1="0"
        x2="0"
        y2="100"
        style={{ stroke: "blue", strokeWidth: 1 }}
      />
      {Array.from({ length: 5 }, (_, index) => {
        const y = 10 + 10 * index;
        return (
          <line
            key={index}
            x1="0"
            y1={y}
            x2="200"
            y2={y}
            style={{ stroke: "blue", strokeWidth: 2 }}
          />
        );
      })}
      <line
        x1="200"
        y1="0"
        x2="200"
        y2="100"
        style={{ stroke: "blue", strokeWidth: 1 }}
      />
    </svg>
  );
}
