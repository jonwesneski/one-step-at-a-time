type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const baseClass =
  'text-sm border border-zinc-300 rounded bg-white px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500';

export function Select({ className, ...props }: SelectProps) {
  return <select className={`${baseClass} ${className ?? ''}`} {...props} />;
}
