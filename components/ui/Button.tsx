import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

type ButtonAsButton = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = ButtonBaseProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950 disabled:bg-stone-300",
  secondary:
    "bg-stone-100 text-stone-900 hover:bg-stone-200 active:bg-stone-300 disabled:bg-stone-50 disabled:text-stone-400",
  ghost:
    "bg-transparent text-stone-700 hover:bg-stone-100 active:bg-stone-200 disabled:text-stone-400",
  outline:
    "border border-stone-200 bg-white text-stone-900 hover:border-stone-300 hover:bg-stone-50 disabled:text-stone-400",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  disabled,
  loading,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:cursor-not-allowed",
    variantStyles[variant],
    sizeStyles[size],
    loading && "opacity-70",
    className,
  );

  const content = (
    <>
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </>
  );

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {content}
      </Link>
    );
  }

  const buttonProps = props as ButtonAsButton;
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {content}
    </button>
  );
}
