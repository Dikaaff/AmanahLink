import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-700 px-5 py-2.5 text-white hover:bg-brand-600",
        secondary:
          "border border-stone-300 bg-white px-5 py-2.5 text-stone-800 hover:border-stone-400 hover:bg-stone-50",
        ghost: "px-3 py-1.5 text-stone-600 hover:bg-stone-100 hover:text-stone-900",
      },
      size: {
        default: "",
        sm: "px-3 py-1.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
