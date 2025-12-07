class CallDetection {
  private isInCall = false
  private onCallStateChange: ((inCall: boolean) => void) | null = null
  private audioContext: AudioContext | null = null

  init(onCallStateChange: (inCall: boolean) => void): void {
    this.onCallStateChange = onCallStateChange

    // Monitor visibility changes (when user switches to phone app)
    document.addEventListener("visibilitychange", () => {
      // When app becomes hidden, assume possible call
      // Real call detection would require native app permissions
      if (document.hidden) {
        // Could be a call, but we can't be certain
        // In a real PWA with more permissions, we'd check for active audio
      }
    })

    // Monitor for audio context interruptions (iOS specific)
    if ("AudioContext" in window) {
      this.audioContext = new AudioContext()

      // iOS will interrupt audio during calls
      this.audioContext.onstatechange = () => {
        if (this.audioContext?.state === "interrupted") {
          this.setCallState(true)
        } else if (this.audioContext?.state === "running") {
          this.setCallState(false)
        }
      }
    }

    // Use Screen Wake Lock API state changes as a hint
    if ("wakeLock" in navigator) {
      document.addEventListener("visibilitychange", async () => {
        // When visibility changes during a call, the system typically
        // releases wake locks
      })
    }
  }

  private setCallState(inCall: boolean): void {
    if (this.isInCall !== inCall) {
      this.isInCall = inCall
      this.onCallStateChange?.(inCall)
    }
  }

  getIsInCall(): boolean {
    return this.isInCall
  }

  // Manual override for testing
  setManualCallState(inCall: boolean): void {
    this.setCallState(inCall)
  }
}

export const callDetection = new CallDetection()
