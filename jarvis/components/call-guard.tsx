"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { callDetection } from "@/lib/call-detection"
import { Phone } from "lucide-react"

interface CallGuardProps {
  children: React.ReactNode
  onCallStart?: () => void
  onCallEnd?: () => void
}

export function CallGuard({ children, onCallStart, onCallEnd }: CallGuardProps) {
  const [isInCall, setIsInCall] = useState(false)

  useEffect(() => {
    callDetection.init((inCall) => {
      setIsInCall(inCall)
      if (inCall) {
        onCallStart?.()
      } else {
        onCallEnd?.()
      }
    })
  }, [onCallStart, onCallEnd])

  if (isInCall) {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Call in Progress</h2>
          <p className="text-muted-foreground">
            JARVIS voice features are paused for your privacy.
            <br />
            They will resume when your call ends.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
