"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Source {
  title: string
  url: string
  source: string
  favicon: string
  snippet?: string
}

interface SwipeableSourcesProps {
  sources: Source[]
  onClose?: () => void
}

export function SwipeableSources({ sources, onClose }: SwipeableSourcesProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Deduplicate sources by URL
  const uniqueSources = sources.reduce((acc: Source[], curr) => {
    if (!acc.find((s) => s.url === curr.url)) acc.push(curr)
    return acc
  }, [])

  const minSwipeDistance = 50

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const currentTouch = e.targetTouches[0].clientX
    setTouchEnd(currentTouch)
    setDragOffset(currentTouch - touchStart)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setDragOffset(0)

    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && currentIndex < uniqueSources.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchEnd(null)
    setTouchStart(e.clientX)
    setIsDragging(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !touchStart) return
    const currentX = e.clientX
    setTouchEnd(currentX)
    setDragOffset(currentX - touchStart)
  }

  const handleMouseUp = () => {
    handleTouchEnd()
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      handleTouchEnd()
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1)
  }

  const goToNext = () => {
    if (currentIndex < uniqueSources.length - 1) setCurrentIndex((prev) => prev + 1)
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrevious()
      if (e.key === "ArrowRight") goToNext()
      if (e.key === "Escape" && onClose) onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentIndex, onClose])

  if (uniqueSources.length === 0) return null

  const currentSource = uniqueSources[currentIndex]

  return (
    <div className="mt-3 relative">
      {/* Source card container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-card/80 to-card border border-border shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      >
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        )}

        {/* Card content with drag animation */}
        <div
          className={cn("p-4 transition-transform", !isDragging && "duration-300 ease-out")}
          style={{
            transform: isDragging ? `translateX(${dragOffset}px)` : "translateX(0)",
            opacity: isDragging ? 0.8 : 1,
          }}
        >
          {/* Source header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
              <img
                src={currentSource.favicon || "/placeholder.svg"}
                alt={currentSource.source}
                className="w-6 h-6"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "/abstract-web.png"
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground truncate">{currentSource.source}</h4>
              <p className="text-xs text-muted-foreground truncate">{new URL(currentSource.url).hostname}</p>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-medium text-foreground mb-2 line-clamp-2">{currentSource.title}</h3>

          {/* Snippet if available */}
          {currentSource.snippet && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{currentSource.snippet}</p>
          )}

          {/* Visit link */}
          <a
            href={currentSource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            Visit Source
          </a>
        </div>

        {/* Navigation arrows */}
        {uniqueSources.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center transition-all",
                currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-background hover:scale-110",
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
              disabled={currentIndex === uniqueSources.length - 1}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 shadow-md flex items-center justify-center transition-all",
                currentIndex === uniqueSources.length - 1
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:bg-background hover:scale-110",
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Page indicators */}
      {uniqueSources.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {uniqueSources.map((source, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "transition-all rounded-full",
                idx === currentIndex
                  ? "w-6 h-2 bg-primary"
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
              title={source.source}
            />
          ))}
        </div>
      )}

      {/* Swipe hint */}
      {uniqueSources.length > 1 && (
        <p className="text-center text-xs text-muted-foreground/60 mt-1">
          Swipe or use arrows to browse {uniqueSources.length} sources
        </p>
      )}
    </div>
  )
}
