type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

const styles = {
  primary:
    'px-3 py-1.5 text-sm rounded border border-accent bg-accent text-on-accent hover:bg-accent-hover cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'px-3 py-1.5 text-sm rounded border border-line-strong bg-surface text-fg hover:bg-surface-hover cursor-pointer',
};

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={`${styles[variant]} ${className ?? ''}`} {...props} />
  );
}
