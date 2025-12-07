import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, maxLength, ...props }, ref) => {
    // h-9 to match icon buttons and default buttons.
    // Default maxLength of 64 for text inputs (not date, number, etc.)
    const shouldApplyMaxLength = !type || type === "text" || type === "search" || type === "email" || type === "tel" || type === "url";
    const effectiveMaxLength = maxLength ?? (shouldApplyMaxLength ? 64 : undefined);
    
    return (
      <input
        type={type}
        maxLength={effectiveMaxLength}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
