type RadioProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
};

const baseClass = 'cursor-pointer accent-accent';
const labelClass =
  'flex items-center gap-1.5 text-sm text-fg-muted has-checked:text-accent has-checked:font-medium cursor-pointer';

export function Radio({ label, className, ...props }: RadioProps) {
  return (
    <label className={labelClass}>
      <input
        type="radio"
        className={`${baseClass} ${className ?? ''}`}
        {...props}
      />
      {label}
    </label>
  );
}
