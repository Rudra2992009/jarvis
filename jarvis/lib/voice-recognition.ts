export interface VoiceRecognitionOptions {
  onResult: (transcript: string, isFinal: boolean) => void
  onWakeWord: () => void
  onSleepWord: () => void
  onInterrupt: () => void
  onVoiceActivity?: () => void
  onError: (error: string) => void
  onStateChange: (state: "idle" | "listening" | "processing") => void
  wakeWord: string
  sleepWord: string
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

class VoiceRecognition {
  private recognition: any | null = null
  private isListening = false
  private isActivated = false
  private options: VoiceRecognitionOptions | null = null
  private restartTimeout: NodeJS.Timeout | null = null
  private pendingTranscript = ""
  private silenceTimeout: NodeJS.Timeout | null = null
  private aiIsSpeaking = false
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private mediaStream: MediaStream | null = null
  private voiceCheckInterval: NodeJS.Timeout | null = null
  private lastVoiceTime = 0

  isSupported(): boolean {
    return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  }

  setAISpeaking(speaking: boolean): void {
    this.aiIsSpeaking = speaking
    if (speaking) {
      this.startVoiceActivityDetection()
    } else {
      this.stopVoiceActivityDetection()
    }
  }

  private async startVoiceActivityDetection(): Promise<void> {
    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      if (!this.audioContext) {
        this.audioContext = new AudioContext()
      }

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume()
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)

      this.voiceCheckInterval = setInterval(() => {
        if (!this.analyser || !this.aiIsSpeaking) return

        this.analyser.getByteFrequencyData(dataArray)

        // Calculate average volume
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length

        if (average > 30) {
          const now = Date.now()
          // Debounce to avoid multiple triggers
          if (now - this.lastVoiceTime > 300) {
            this.lastVoiceTime = now
            console.log("[v0] Voice activity detected, interrupting AI")
            this.aiIsSpeaking = false
            this.options?.onVoiceActivity?.()
            this.options?.onInterrupt()
          }
        }
      }, 50)
    } catch (error) {
      console.error("Voice activity detection error:", error)
    }
  }

  private stopVoiceActivityDetection(): void {
    if (this.voiceCheckInterval) {
      clearInterval(this.voiceCheckInterval)
      this.voiceCheckInterval = null
    }
  }

  init(options: VoiceRecognitionOptions): void {
    if (!this.isSupported()) {
      options.onError("Speech recognition not supported in this browser")
      return
    }

    this.options = options
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    this.recognition = new SpeechRecognitionAPI()

    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-IN"
    this.recognition.maxAlternatives = 1

    this.recognition.onresult = (event: any) => {
      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (!result || !result[0] || !result[0].transcript) {
          continue
        }
        const transcript = result[0].transcript.toLowerCase().trim()

        if (result.isFinal) {
          finalTranscript += transcript + " "
        } else {
          interimTranscript += transcript
        }
      }

      const currentTranscript = (finalTranscript + interimTranscript).trim()

      if (this.aiIsSpeaking && currentTranscript.length > 0) {
        console.log("[v0] Speech detected while AI speaking, interrupting")
        this.aiIsSpeaking = false
        options.onVoiceActivity?.()
        options.onInterrupt()
      }

      // Check for wake word when not activated
      if (!this.isActivated) {
        if (currentTranscript.includes(options.wakeWord.toLowerCase())) {
          this.isActivated = true
          this.pendingTranscript = ""
          options.onWakeWord()
          options.onStateChange("listening")
          return
        }
      }

      // Check for sleep word when activated
      if (this.isActivated) {
        if (currentTranscript.includes(options.sleepWord.toLowerCase())) {
          this.isActivated = false
          this.pendingTranscript = ""
          options.onSleepWord()
          options.onStateChange("idle")
          return
        }

        if (currentTranscript) {
          this.pendingTranscript = currentTranscript
          options.onResult(currentTranscript, finalTranscript.length > 0)
        }

        // Reset silence detection
        if (this.silenceTimeout) clearTimeout(this.silenceTimeout)

        // If we have a final transcript, wait for silence before processing
        if (finalTranscript.length > 0 && currentTranscript) {
          this.silenceTimeout = setTimeout(() => {
            if (this.pendingTranscript) {
              options.onStateChange("processing")
            }
          }, 1200)
        }
      }
    }

    this.recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return
      }

      console.error("Speech recognition error:", event.error)
      options.onError(event.error)

      if (["network", "audio-capture", "not-allowed"].includes(event.error)) {
        this.scheduleRestart()
      }
    }

    this.recognition.onend = () => {
      if (this.isListening) {
        this.scheduleRestart()
      }
    }
  }

  private scheduleRestart(): void {
    if (this.restartTimeout) clearTimeout(this.restartTimeout)

    this.restartTimeout = setTimeout(() => {
      if (this.isListening && this.recognition) {
        try {
          this.recognition.start()
        } catch (e) {
          // Already started
        }
      }
    }, 100)
  }

  start(): void {
    if (!this.recognition) return

    this.isListening = true
    try {
      this.recognition.start()
      this.options?.onStateChange("idle")
    } catch (e) {
      // Already started
    }
  }

  stop(): void {
    this.isListening = false
    this.isActivated = false
    this.pendingTranscript = ""
    this.aiIsSpeaking = false

    if (this.restartTimeout) clearTimeout(this.restartTimeout)
    if (this.silenceTimeout) clearTimeout(this.silenceTimeout)
    this.stopVoiceActivityDetection()

    if (this.recognition) {
      try {
        this.recognition.stop()
      } catch (e) {
        // Already stopped
      }
    }

    // Clean up audio resources
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
  }

  activate(): void {
    this.isActivated = true
    this.pendingTranscript = ""
    this.options?.onStateChange("listening")
  }

  deactivate(): void {
    this.isActivated = false
    this.pendingTranscript = ""
    this.options?.onStateChange("idle")
  }

  isActive(): boolean {
    return this.isActivated
  }

  isCurrentlyListening(): boolean {
    return this.isListening
  }

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaStream = stream // Keep the stream for voice activity detection
      return true
    } catch (e) {
      return false
    }
  }
}

export const voiceRecognition = new VoiceRecognition()
