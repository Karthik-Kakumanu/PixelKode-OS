import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300 disabled:pointer-events-none disabled:opacity-55 disabled:saturate-75 dark:disabled:bg-white/[0.04] dark:disabled:text-zinc-500",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-fuchsia-300 via-violet-300 to-sky-300 text-slate-900 shadow-lg shadow-fuchsia-100/70 hover:-translate-y-0.5 dark:shadow-none",
        ghost: "bg-white/40 text-slate-700 hover:bg-white/65 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08]",
        outline:
          "border border-violet-200 bg-white/35 text-slate-700 hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:bg-white/[0.08]",
        secondary: "bg-white/60 text-slate-800 hover:bg-white/80 dark:bg-white/[0.08] dark:text-zinc-100 dark:hover:bg-white/[0.12]"
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning={!asChild}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
