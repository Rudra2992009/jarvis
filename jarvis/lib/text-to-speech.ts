export interface TTSOptions {
  voice?: SpeechSynthesisVoice
  rate?: number
  pitch?: number
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
}

class TextToSpeech {
  private synth: SpeechSynthesis | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private preferredVoice: SpeechSynthesisVoice | null = null
  private queue: Array<{ text: string; options: TTSOptions }> = []
  private isProcessing = false
  private voicesLoaded = false

  isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window
  }

  init(): void {
    if (!this.isSupported()) return

    this.synth = window.speechSynthesis

    const loadVoices = () => {
      const voices = this.synth!.getVoices()
      if (voices.length === 0) return

      this.voicesLoaded = true

      const voicePreferences = [
        // Indian English male voices - highest priority
        (v: SpeechSynthesisVoice) => v.lang === "en-IN" && v.name.toLowerCase().includes("male"),
        (v: SpeechSynthesisVoice) => v.lang === "en-IN" && v.name.toLowerCase().includes("ravi"),
        (v: SpeechSynthesisVoice) => v.lang === "en-IN" && v.name.toLowerCase().includes("kumar"),
        (v: SpeechSynthesisVoice) => v.lang === "en-IN" && !v.name.toLowerCase().includes("female"),
        // Any Indian English voice
        (v: SpeechSynthesisVoice) => v.lang === "en-IN",
        (v: SpeechSynthesisVoice) => v.lang.startsWith("en-IN"),
        // Hindi voices as fallback
        (v: SpeechSynthesisVoice) => v.lang === "hi-IN" && v.name.toLowerCase().includes("male"),
        (v: SpeechSynthesisVoice) => v.lang === "hi-IN",
        // Google Indian English
        (v: SpeechSynthesisVoice) => v.name.includes("Google") && v.lang === "en-IN",
        // Microsoft Indian voices
        (v: SpeechSynthesisVoice) => v.name.includes("Microsoft") && v.lang === "en-IN",
        // Any male English voice as last resort
        (v: SpeechSynthesisVoice) => v.lang.startsWith("en") && v.name.toLowerCase().includes("male"),
        // Any English voice
        (v: SpeechSynthesisVoice) => v.lang.startsWith("en"),
      ]

      for (const preference of voicePreferences) {
        const voice = voices.find(preference)
        if (voice) {
          this.preferredVoice = voice
          console.log("[v0] Selected voice:", voice.name, voice.lang)
          break
        }
      }

      // Fallback to first voice if none matched
      if (!this.preferredVoice && voices.length > 0) {
        this.preferredVoice = voices[0]
      }
    }

    // Load voices - they might be available immediately or after an event
    if (this.synth.getVoices().length > 0) {
      loadVoices()
    }
    this.synth.onvoiceschanged = loadVoices
  }

  speak(text: string, options: TTSOptions = {}): void {
    if (!this.synth) return

    // Add to queue
    this.queue.push({ text, options })
    this.processQueue()
  }

  private processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) return

    this.isProcessing = true
    const { text, options } = this.queue.shift()!

    // Cancel any current speech
    this.synth!.cancel()

    const utterance = new SpeechSynthesisUtterance(text)

    // Use provided voice or preferred voice
    if (options.voice) {
      utterance.voice = options.voice
    } else if (this.preferredVoice) {
      utterance.voice = this.preferredVoice
    }

    utterance.rate = options.rate ?? 0.95
    utterance.pitch = options.pitch ?? 0.9
    utterance.volume = 1.0

    utterance.onstart = () => {
      options.onStart?.()
    }

    utterance.onend = () => {
      this.isProcessing = false
      options.onEnd?.()
      // Process next in queue
      this.processQueue()
    }

    utterance.onerror = (e) => {
      this.isProcessing = false
      options.onError?.(e.error)
      // Continue with queue even on error
      this.processQueue()
    }

    this.currentUtterance = utterance
    this.synth!.speak(utterance)
  }

  stop(): void {
    this.queue = []
    this.isProcessing = false

    if (this.synth) {
      this.synth.cancel()
    }
  }

  pause(): void {
    this.synth?.pause()
  }

  resume(): void {
    this.synth?.resume()
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.synth?.getVoices() || []
  }

  getIndianVoices(): SpeechSynthesisVoice[] {
    const voices = this.synth?.getVoices() || []
    return voices.filter((v) => v.lang === "en-IN" || v.lang === "hi-IN")
  }

  getPreferredVoice(): SpeechSynthesisVoice | null {
    return this.preferredVoice
  }

  setPreferredVoice(voice: SpeechSynthesisVoice): void {
    this.preferredVoice = voice
  }

  isSpeaking(): boolean {
    return this.synth?.speaking || false
  }

  isPaused(): boolean {
    return this.synth?.paused || false
  }

  isVoicesLoaded(): boolean {
    return this.voicesLoaded
  }
}

export const textToSpeech = new TextToSpeech()
