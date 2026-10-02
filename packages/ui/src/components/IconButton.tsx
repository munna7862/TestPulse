import * as React from "react";
import { Button, type ButtonProps } from "./Button";
import { cn } from "../lib/utils";

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  "aria-label": string;
  size?: "sm" | "md" | "lg";
}

const iconSizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-10 w-10 text-base",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", "aria-label": ariaLabel, ...props }, ref) => {
    return (
      <Button ref={ref} size="icon" aria-label={ariaLabel} className={cn(iconSizes[size], className)} {...props} />
    );
  },
);

IconButton.displayName = "IconButton";
