import * as React from "react";

import { cn } from "@/lib/utils";

/** Wraps the design's `.input` (index.css @layer components): 10px radius, teal focus ring. */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} ref={ref} className={cn("input", className)} {...props} />
  ),
);
Input.displayName = "Input";
