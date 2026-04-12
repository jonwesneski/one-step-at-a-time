type Props = React.InputHTMLAttributes<HTMLInputElement>;

const baseClass =
  'w-full text-sm border border-zinc-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';

export function TextInput({ className, ...props }: Props) {
  return <input className={`${baseClass} ${className ?? ''}`} {...props} />;
}
