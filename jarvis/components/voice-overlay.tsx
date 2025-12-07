"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { JarvisOrb } from "./jarvis-orb"
import { ChatInterface } from "./chat-interface"
import { LiveChatButton } from "./live-chat-button"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VoiceOverlayProps {
  isOpen: boolean
  onClose: () => void
  jarvisState: "idle" | "listening" | "speaking" | "processing"
  setJarvisState: (state: "idle" | "listening" | "speaking" | "processing") => void
  voiceTranscript?: string
  onToggleVoice?: () => void
  isVoiceMode?: boolean
  onOpenSettings?: () => void
  onOpenHistory?: () => void
  userApiKey?: string
}

export function VoiceOverlay({
  isOpen,
  onClose,
  jarvisState,
  setJarvisState,
  voiceTranscript,
  onToggleVoice,
  isVoiceMode,
  onOpenSettings,
  onOpenHistory,
  userApiKey,
}: VoiceOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      // Small delay before showing fullscreen mode
      setTimeout(() => setShowFullscreen(true), 100)
    } else {
      setShowFullscreen(false)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setShowFullscreen(false)
    setTimeout(onClose, 300)
  }, [onClose])

  // Keyboard shortcut to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen && !isAnimating) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex transition-all duration-500 ease-out",
        showFullscreen ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onTransitionEnd={() => {
        if (!isOpen) setIsAnimating(false)
      }}
    >
      {/* Animated background with gradient */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-500",
          showFullscreen ? "backdrop-blur-xl" : "backdrop-blur-none",
        )}
        style={{
          background: showFullscreen
            ? "radial-gradient(ellipse at center, rgba(10, 22, 40, 0.95) 0%, rgba(5, 10, 20, 0.98) 100%)"
            : "transparent",
        }}
        onClick={handleClose}
      />

      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Chat Panel - slides in from right */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-full md:w-1/2 lg:w-2/5 transition-all duration-500 ease-out",
          showFullscreen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        )}
      >
        <ChatInterface
          isOverlay
          onClose={handleClose}
          jarvisState={jarvisState}
          setJarvisState={setJarvisState}
          isVoiceMode={isVoiceMode}
          onToggleVoice={onToggleVoice}
          voiceTranscript={voiceTranscript}
          onOpenSettings={onOpenSettings}
          onOpenHistory={onOpenHistory}
          userApiKey={userApiKey}
        />
      </div>

      {/* Mobile close button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleClose}
        className={cn(
          "absolute top-4 left-4 md:hidden bg-background/80 backdrop-blur-sm z-10 transition-all duration-300",
          showFullscreen ? "opacity-100 scale-100" : "opacity-0 scale-75",
        )}
      >
        <X className="w-4 h-4" />
      </Button>

      {/* Large orb on left side for desktop */}
      <div
        className={cn(
          "hidden md:flex absolute left-0 top-0 bottom-0 w-1/2 lg:w-3/5 items-center justify-center pointer-events-none transition-all duration-700",
          showFullscreen ? "opacity-100 scale-100" : "opacity-0 scale-75",
        )}
      >
        <div className="relative">
          {/* Ambient glow behind orb */}
          <div
            className={cn(
              "absolute inset-0 rounded-full blur-3xl transition-all duration-500",
              jarvisState === "speaking" && "bg-primary/30 scale-150",
              jarvisState === "listening" && "bg-primary/20 scale-125",
              jarvisState === "processing" && "bg-primary/15 scale-110 animate-pulse",
              jarvisState === "idle" && "bg-primary/10 scale-100",
            )}
            style={{ width: "300px", height: "300px", margin: "-50px" }}
          />

          <JarvisOrb state={jarvisState} size="xl" showParticles />
        </div>

        {/* Status text below orb */}
        <div
          className={cn(
            "absolute bottom-12 left-1/2 -translate-x-1/2 text-center transition-all duration-500",
            showFullscreen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <p className="text-xl font-medium text-foreground mb-2">
            {jarvisState === "listening" && "I'm listening, Sir."}
            {jarvisState === "speaking" && "Speaking..."}
            {jarvisState === "processing" && "Processing your request..."}
            {jarvisState === "idle" && "At your service."}
          </p>

          {voiceTranscript && isVoiceMode && (
            <div className="mt-4 max-w-md mx-auto">
              <p className="text-muted-foreground italic text-lg">"{voiceTranscript}"</p>
            </div>
          )}

          {/* Voice mode indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                isVoiceMode ? "bg-green-500 animate-pulse" : "bg-muted-foreground",
              )}
            />
            <span className="text-sm text-muted-foreground">
              {isVoiceMode ? "Voice mode active" : "Voice mode inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile orb and status */}
      <div
        className={cn(
          "md:hidden absolute top-20 left-1/2 -translate-x-1/2 text-center transition-all duration-500",
          showFullscreen ? "opacity-100 scale-100" : "opacity-0 scale-75",
        )}
      >
        <JarvisOrb state={jarvisState} size="lg" />
        <p className="mt-4 text-lg font-medium text-foreground">
          {jarvisState === "listening" && "Listening..."}
          {jarvisState === "speaking" && "Speaking..."}
          {jarvisState === "processing" && "Processing..."}
          {jarvisState === "idle" && "Ready"}
        </p>
        {voiceTranscript && isVoiceMode && (
          <p className="mt-2 text-muted-foreground italic text-sm max-w-xs">"{voiceTranscript}"</p>
        )}

        <div className="mt-6 flex justify-center">
          <LiveChatButton className="w-14 h-14" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Tap for Live Mode</p>
      </div>
    </div>
  )
}
