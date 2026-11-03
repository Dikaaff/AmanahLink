import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge cannot tell `text-body-sm` (font size, our token) from
 * `text-inverse` (color), so it drops one of them. Registering the product
 * scale keeps `variant` colors and `size` sizes together.
 */
const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "display-lg",
            "h1",
            "h1-lg",
            "h2",
            "h2-lg",
            "h3",
            "h3-lg",
            "body",
            "body-sm",
            "label",
            "num-lg",
            "num-lg-md",
            "num-md",
            "num-sm",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
