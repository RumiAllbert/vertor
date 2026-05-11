"use client";
import * as React from "react";
import * as SA from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof SA.Root>,
  React.ComponentPropsWithoutRef<typeof SA.Root>
>(({ className, children, ...props }, ref) => (
  <SA.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <SA.Viewport className="h-full w-full rounded-[inherit]">{children}</SA.Viewport>
    <SA.Scrollbar
      orientation="vertical"
      className="flex h-full w-1.5 touch-none select-none p-px transition-colors"
    >
      <SA.Thumb className="relative flex-1 rounded-full bg-border" />
    </SA.Scrollbar>
    <SA.Corner />
  </SA.Root>
));
ScrollArea.displayName = "ScrollArea";
