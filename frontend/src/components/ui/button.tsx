import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button (§9.1, §9.2). One primary action per screen; secondary actions are
 * outline or text weight. Height comes from the 4pt scale: 44 / 48 / 52.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm",
    "font-medium transition-[background-color,border-color,color,transform] duration-100",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-40 aria-busy:opacity-100",
  ],
  {
    variants: {
      variant: {
        primary: "bg-ink text-inverse hover:bg-ink-hover",
        secondary:
          "border border-line-strong bg-canvas text-ink hover:border-ink",
        ghost: "text-ink-secondary hover:bg-sunken hover:text-ink",
      },
      size: {
        sm: "min-h-11 px-4 text-body-sm",
        md: "min-h-12 px-5 text-body",
        cta: "min-h-13 w-full px-5 text-body",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "sm",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Keeps the label, swaps it for a spinner and blocks the action. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <Loader2
          aria-hidden="true"
          size={14}
          strokeWidth={2}
          className="animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {children}
    </button>
  );
}

export { buttonVariants };
