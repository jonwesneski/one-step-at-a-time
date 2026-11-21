type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

// The native arrow sits flush against the border in some browsers (Safari
// ignores padding-right), so it's replaced with a background chevron.
const CARET_URL = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="none" stroke="#71717a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.5 9 4.5"/></svg>'
)}")`;

const baseClass =
  'text-sm border border-line-strong rounded bg-surface pl-2 pr-7 py-1.5 cursor-pointer appearance-none bg-no-repeat bg-[length:12px_12px] bg-[position:right_0.5rem_center] focus:outline-none focus:ring-1 focus:ring-accent';

export function Select({ className, style, ...props }: SelectProps) {
  return (
    <select
      className={`${baseClass} ${className ?? ''}`}
      style={{ backgroundImage: CARET_URL, ...style }}
      {...props}
    />
  );
}
