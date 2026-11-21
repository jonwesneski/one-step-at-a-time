type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const baseClass =
  'w-full text-sm border border-line-strong rounded px-2 py-1.5 bg-surface focus:outline-none focus:ring-1 focus:ring-accent';

export function TextInput({ className, ...props }: TextInputProps) {
  return <input className={`${baseClass} ${className ?? ''}`} {...props} />;
}
