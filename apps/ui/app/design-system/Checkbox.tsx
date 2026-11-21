type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label: React.ReactNode;
};

const baseClass = 'cursor-pointer accent-accent';
const labelClass =
  'flex items-center gap-1.5 text-sm text-fg-muted has-checked:text-accent has-checked:font-medium cursor-pointer';

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={labelClass}>
      <input
        type="checkbox"
        className={`${baseClass} ${className ?? ''}`}
        {...props}
      />
      {label}
    </label>
  );
}
