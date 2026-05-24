import * as React from "react";

import { cn } from "@/lib/utils";

/** Wraps the design's `.textarea` (index.css @layer components). */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("textarea", className)} {...props} />
));
Textarea.displayName = "Textarea";
