type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label: React.ReactNode;
};

const baseClass = 'cursor-pointer accent-blue-600';
const labelClass =
  'flex items-center gap-1.5 text-sm text-zinc-500 has-checked:text-blue-600 has-checked:font-medium cursor-pointer';

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
