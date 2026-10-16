"use client"

import * as React from "react"
import { cn } from "cn"
import { Slider as SliderPrimitive } from "radix-ui"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /** Accessible name for the thumb, which is the element that actually takes focus. */
  thumbLabel?: string
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex h-4 w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-rule data-horizontal:h-0.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-0.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-signal select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={thumbLabel}
          className="relative block size-4 shrink-0 cursor-grab rounded-full bg-signal transition-transform select-none after:absolute after:-inset-3 hover:scale-110 active:scale-110 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
