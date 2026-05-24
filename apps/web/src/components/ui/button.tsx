import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // navy primary CTA
        default: "bg-primary text-primary-foreground hover:bg-navy-800",
        // teal accent CTA
        teal: "bg-teal-500 text-white hover:bg-teal-600",
        // soft neutral
        secondary: "bg-ink-50 text-navy-900 hover:bg-ink-100",
        // soft danger
        destructive: "bg-red-soft text-destructive hover:bg-red-soft/70",
        // bordered
        outline: "border border-input bg-transparent text-navy-900 hover:bg-ink-50",
        // borderless
        ghost: "bg-transparent text-navy-900 hover:bg-ink-50",
        link: "text-teal-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-[13px]",
        lg: "h-11 px-6",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
