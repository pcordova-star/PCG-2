"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type CalendarProps = {
  className?: string;
  classNames?: any;
  showOutsideDays?: boolean;
  mode?: "single";
  selected?: Date;
  onSelect?: (date?: Date) => void;
  [key: string]: any; // Accept any other props
};

function Calendar({
  className,
  ...props
}: CalendarProps) {
  return (
    <div className={cn("p-3 border rounded-md bg-muted text-center text-sm text-muted-foreground", className)}>
      Calendario deshabilitado temporalmente para ahorrar espacio.
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
