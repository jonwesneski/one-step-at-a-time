type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

const styles = {
  primary:
    'px-3 py-1.5 text-sm rounded border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'px-3 py-1.5 text-sm rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer',
};

export function Button({ variant = 'primary', className, ...props }: Props) {
  return (
    <button className={`${styles[variant]} ${className ?? ''}`} {...props} />
  );
}
