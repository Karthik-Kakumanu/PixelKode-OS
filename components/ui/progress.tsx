"use client";

import * as ProgressPrimitive from "@radix-ui/react-progress";

export function Progress({ value }: { value: number }) {
  return (
    <ProgressPrimitive.Root className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all"
        style={{ width: `${value}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
