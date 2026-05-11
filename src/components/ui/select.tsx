"use client";
import * as React from "react";
import * as Sel from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Select = Sel.Root;
export const SelectGroup = Sel.Group;
export const SelectValue = Sel.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof Sel.Trigger>,
  React.ComponentPropsWithoutRef<typeof Sel.Trigger>
>(({ className, children, ...props }, ref) => (
  <Sel.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent/40 data-[placeholder]:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    <Sel.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </Sel.Icon>
  </Sel.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof Sel.Content>,
  React.ComponentPropsWithoutRef<typeof Sel.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <Sel.Portal>
    <Sel.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        "relative z-50 max-h-72 min-w-[12rem] overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl",
        position === "popper" && "translate-y-0",
        className,
      )}
      {...props}
    >
      <Sel.ScrollUpButton className="flex h-6 cursor-default items-center justify-center">
        <ChevronUp className="h-4 w-4" />
      </Sel.ScrollUpButton>
      <Sel.Viewport className="p-1">{children}</Sel.Viewport>
      <Sel.ScrollDownButton className="flex h-6 cursor-default items-center justify-center">
        <ChevronDown className="h-4 w-4" />
      </Sel.ScrollDownButton>
    </Sel.Content>
  </Sel.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof Sel.Label>,
  React.ComponentPropsWithoutRef<typeof Sel.Label>
>(({ className, ...props }, ref) => (
  <Sel.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
));
SelectLabel.displayName = "SelectLabel";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof Sel.Item>,
  React.ComponentPropsWithoutRef<typeof Sel.Item>
>(({ className, children, ...props }, ref) => (
  <Sel.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Sel.ItemIndicator>
        <Check className="h-3.5 w-3.5" />
      </Sel.ItemIndicator>
    </span>
    <Sel.ItemText>{children}</Sel.ItemText>
  </Sel.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof Sel.Separator>,
  React.ComponentPropsWithoutRef<typeof Sel.Separator>
>(({ className, ...props }, ref) => (
  <Sel.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));
SelectSeparator.displayName = "SelectSeparator";
