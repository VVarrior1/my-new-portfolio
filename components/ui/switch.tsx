"use client"

import * as React from "react"
import { cn } from "cn"
import { Switch as SwitchPrimitive } from "radix-ui"

/**
 * The simulator's switch. Off is a solid graphite-blue track (3.5:1 against the page, so the
 * control is visible before it is touched), on is the signal; the hit area is 24px tall and
 * focus uses the site's single outline style (see .sim-switch in globals.css).
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root data-slot="switch" className={cn("sim-switch disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
