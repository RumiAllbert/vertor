"use client";
import * as React from "react";
import * as Pop from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = Pop.Root;
export const PopoverTrigger = Pop.Trigger;
export const PopoverAnchor = Pop.Anchor;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof Pop.Content>,
  React.ComponentPropsWithoutRef<typeof Pop.Content>
>(({ className, align = "center", sideOffset = 8, ...props }, ref) => (
  <Pop.Portal>
    <Pop.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-80 rounded-md border border-foreground/15 bg-background text-foreground shadow-[0_8px_32px_-8px_rgb(0_0_0/0.18)] p-3",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    />
  </Pop.Portal>
));
PopoverContent.displayName = "PopoverContent";
