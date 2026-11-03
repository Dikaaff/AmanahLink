import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Button (§9.1, §9.2). Satu aksi primer per layar; aksi sekunder = outline / text.
 * Tinggi dari skala 4pt §7.2: 44 / 48 / 52.
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
        outline: "border border-line-strong text-ink hover:bg-sunken",
        ghost: "text-ink-secondary hover:bg-sunken hover:text-ink",
      },
      size: {
        sm: "min-h-11 px-4 text-body-sm",
        md: "min-h-12 px-5 text-body",
        cta: "min-h-13 w-full px-5 text-body",
      },
      loading: {
        true: "opacity-60 aria-busy",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      loading: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Menjaga label, mengganti dengan spinner, dan memblokir aksi. */
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
      className={cn(buttonVariants({ variant, size, loading }), className)}
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
