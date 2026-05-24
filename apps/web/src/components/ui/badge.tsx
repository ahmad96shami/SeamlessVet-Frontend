import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Maps onto the design's `.pill` tones (index.css @layer components). */
const badgeVariants = cva("pill", {
  variants: {
    variant: {
      default: "teal",
      secondary: "gray",
      success: "green",
      warning: "amber",
      destructive: "red",
      navy: "navy",
      outline: "",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
