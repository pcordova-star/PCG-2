"use client"

// This component has been disabled to save space.
import * as React from "react"

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    return <div ref={ref} className="relative">Carousel Disabled</div>
});
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    return <div ref={ref} className="flex">-</div>
});
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    return <div ref={ref} className="min-w-0">Item</div>
});
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = () => null;
const CarouselNext = () => null;

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
export type CarouselApi = any;
