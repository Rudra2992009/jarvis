"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SwipeableSources } from "@/components/swipeable-sources"
import {
  ArrowLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Video,
  VideoOff,
  RotateCcw,
  Search,
  ChevronDown,
  Cpu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { voiceRecognition } from "@/lib/voice-recognition"
import { textToSpeech } from "@/lib/text-to-speech"
import { jarvisStorage, type JarvisSettings, type Conversation } from "@/lib/jarvis-storage"

type JarvisState = "idle" | "listening" | "speaking" | "processing"

interface Source {
  title: string
  url: string
  source: string
  favicon: string
  snippet?: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  sources?: Source[]
}

export default function LiveChatPage() {
  const router = useRouter()
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle")
  const [transcript, setTranscript] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [currentSources, setCurrentSources] = useState<Source[]>([])
  const [showSources, setShowSources] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt")
  const [statusText, setStatusText] = useState("Initializing...")
  const [settings, setSettings] = useState<JarvisSettings | null>(null)
  const [deepSearchMode, setDeepSearchMode] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [currentConversationId] = useState(() => crypto.randomUUID())

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const pausedTranscriptRef = useRef<string>("")
  const isInitializedRef = useRef(false)

  // Load settings
  useEffect(() => {
    jarvisStorage.getSettings().then((s) => {
      setSettings(s)
    })
  }, [])

  // Save conversation to history
  useEffect(() => {
    if (messages.length > 0) {
      const conversation: Conversation = {
        id: currentConversationId,
        title: messages[0]?.content.slice(0, 50) || "Live Conversation",
        messages: messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      jarvisStorage.saveConversation(conversation)
    }
  }, [messages, currentConversationId])

  // Scroll handling
  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement
    if (scrollElement) {
      scrollViewportRef.current = scrollElement

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
        setShowScrollButton(!isNearBottom && messages.length > 0)
      }

      scrollElement.addEventListener("scroll", handleScroll)
      return () => scrollElement.removeEventListener("scroll", handleScroll)
    }
  }, [messages.length])

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      })
    }
  }, [])

  useEffect(() => {
    scrollToBottom(true)
  }, [messages, aiResponse, scrollToBottom])

  // Request microphone permission
  const requestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
      setMicPermission("granted")
      return true
    } catch (error) {
      console.error("Mic permission error:", error)
      setMicPermission("denied")
      return false
    }
  }, [])

  // Check mic permission on mount
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((result) => {
        setMicPermission(result.state as "granted" | "denied" | "prompt")
        result.onchange = () => {
          setMicPermission(result.state as "granted" | "denied" | "prompt")
        }
      })
    }
  }, [])

  // Send message to AI
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return

      setIsLoading(true)
      setJarvisState("processing")
      setStatusText("Thinking...")
      setAiResponse("")
      setCurrentSources([])
      setShowSources(false)

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMessage])

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            userApiKey: settings?.userApiKey,
            isLiveMode: true,
            deepSearch: deepSearchMode,
            useLocalModel: settings?.useLocalModel,
            selectedLocalModel: settings?.selectedLocalModel,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error("Failed to get response")
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ""
        let sources: Source[] = []

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.type === "sources" && data.sources) {
                    sources = data.sources
                    setCurrentSources(sources)
                  }
                  if (data.type === "text-delta" && data.textDelta) {
                    fullResponse += data.textDelta
                    setAiResponse(fullResponse)
                  }
                } catch {}
              }
            }
          }
        }

        // Add AI response to messages
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: fullResponse,
          timestamp: Date.now(),
          sources: sources.length > 0 ? sources : undefined,
        }
        setMessages((prev) => [...prev, assistantMessage])

        // Speak the response
        if (fullResponse && !isMuted && !isPaused) {
          setJarvisState("speaking")
          setStatusText("Speaking...")
          textToSpeech.speak(fullResponse, {
            onEnd: () => {
              if (!isPaused) {
                setJarvisState("listening")
                setStatusText("Listening...")
                setTranscript("")
                voiceRecognition.start()
              }
            },
          })
        } else {
          if (!isPaused) {
            setJarvisState("listening")
            setStatusText("Listening...")
            setTranscript("")
            voiceRecognition.start()
          }
        }
      } catch (error: any) {
        if (error.name === "AbortError") return
        console.error("Chat error:", error)
        setAiResponse("I apologize, Sir. Something went wrong. Please try again.")
        setJarvisState("idle")
        setStatusText("Error occurred")
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [messages, settings, isMuted, isPaused, deepSearchMode],
  )

  // Initialize voice recognition
  useEffect(() => {
    if (micPermission !== "granted" || isInitializedRef.current) return

    isInitializedRef.current = true

    voiceRecognition.init({
      continuous: true,
      interimResults: true,
      lang: "en-IN",
      onResult: (text, isFinal) => {
        setTranscript(text)

        // Barge-in: Stop AI if user starts speaking
        if (jarvisState === "speaking" && text.length > 3) {
          textToSpeech.stop()
          abortControllerRef.current?.abort()
          setJarvisState("listening")
          setStatusText("Listening...")
        }

        if (isFinal && text.trim() && !isPaused) {
          sendMessage(text)
        }
      },
      onSleepWord: () => {
        textToSpeech.stop()
        voiceRecognition.stop()
        router.push("/")
      },
      onError: (error) => {
        console.error("Voice error:", error)
        if (error === "not-allowed") {
          setMicPermission("denied")
        }
      },
      onStateChange: (state) => {
        if (state === "listening" && !isPaused) {
          setStatusText("Listening...")
        }
      },
    })

    // Start listening
    if (!isPaused) {
      setJarvisState("listening")
      setStatusText("Listening...")
      voiceRecognition.start()
    }

    return () => {
      voiceRecognition.stop()
      textToSpeech.stop()
    }
  }, [micPermission, isPaused, router, sendMessage, jarvisState])

  // Handle pause/resume
  const togglePause = useCallback(() => {
    if (isPaused) {
      setIsPaused(false)
      setTranscript(pausedTranscriptRef.current)
      setJarvisState("listening")
      setStatusText("Listening...")
      voiceRecognition.start()
    } else {
      setIsPaused(true)
      pausedTranscriptRef.current = transcript
      voiceRecognition.stop()
      textToSpeech.stop()
      abortControllerRef.current?.abort()
      setJarvisState("idle")
      setStatusText("Paused")
    }
  }, [isPaused, transcript])

  // Handle mute
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
    if (!isMuted) {
      textToSpeech.stop()
    }
  }, [isMuted])

  // Handle video
  const toggleVideo = useCallback(async () => {
    if (isVideoOn) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
      setIsVideoOn(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
        })
        mediaStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIsVideoOn(true)
      } catch (error) {
        console.error("Video error:", error)
      }
    }
  }, [isVideoOn, facingMode])

  // Switch camera
  const switchCamera = useCallback(async () => {
    const newFacingMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newFacingMode)

    if (isVideoOn) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
        })
        mediaStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch (error) {
        console.error("Camera switch error:", error)
      }
    }
  }, [facingMode, isVideoOn])

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()
    window.addEventListener("resize", resize)

    let animationId: number
    let time = 0

    const animate = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight
      ctx.clearRect(0, 0, width, height)

      const centerX = width / 2
      const centerY = height / 2
      const baseRadius = Math.min(width, height) * 0.25

      time += isPaused ? 0.005 : 0.02

      // Glow effect
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * 2)
      const glowIntensity = jarvisState === "speaking" ? 0.4 : jarvisState === "listening" ? 0.3 : 0.2
      gradient.addColorStop(0, `rgba(6, 182, 212, ${glowIntensity})`)
      gradient.addColorStop(0.5, `rgba(6, 182, 212, ${glowIntensity * 0.5})`)
      gradient.addColorStop(1, "rgba(6, 182, 212, 0)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Main orb
      const pulseScale = jarvisState === "speaking" ? 1 + Math.sin(time * 4) * 0.1 : 1 + Math.sin(time * 2) * 0.05
      const orbRadius = baseRadius * pulseScale

      const orbGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, orbRadius)
      orbGradient.addColorStop(0, "rgba(6, 182, 212, 0.9)")
      orbGradient.addColorStop(0.7, "rgba(6, 182, 212, 0.5)")
      orbGradient.addColorStop(1, "rgba(6, 182, 212, 0.1)")

      ctx.beginPath()
      ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2)
      ctx.fillStyle = orbGradient
      ctx.fill()

      // Audio waves when speaking
      if (jarvisState === "speaking") {
        for (let i = 0; i < 3; i++) {
          const waveRadius = orbRadius + 20 + i * 25 + Math.sin(time * 3 + i) * 10
          ctx.beginPath()
          ctx.arc(centerX, centerY, waveRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.3 - i * 0.1})`
          ctx.lineWidth = 2
          ctx.stroke()
        }
      }

      // Listening indicator
      if (jarvisState === "listening") {
        const indicatorRadius = orbRadius + 15 + Math.sin(time * 5) * 5
        ctx.beginPath()
        ctx.arc(centerX, centerY, indicatorRadius, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(34, 197, 94, 0.6)"
        ctx.lineWidth = 3
        ctx.stroke()
      }

      // Pause overlay
      if (isPaused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
        ctx.fillRect(0, 0, width, height)

        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
        const barWidth = 15
        const barHeight = 50
        const gap = 15
        ctx.fillRect(centerX - gap - barWidth, centerY - barHeight / 2, barWidth, barHeight)
        ctx.fillRect(centerX + gap, centerY - barHeight / 2, barWidth, barHeight)
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [jarvisState, isPaused])

  // Permission request screen
  if (micPermission !== "granted") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 animate-pulse">
          <Mic className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Microphone Access Required</h1>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          JARVIS needs microphone access to hear your voice commands. Please allow microphone access to continue.
        </p>
        <Button onClick={requestMicPermission} size="lg" className="gap-2">
          <Mic className="w-5 h-5" />
          Allow Microphone
        </Button>
        {micPermission === "denied" && (
          <p className="text-red-400 text-sm mt-4 text-center">
            Microphone access was denied. Please enable it in your browser settings and refresh the page.
          </p>
        )}
        <Button variant="ghost" onClick={() => router.push("/")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">JARVIS Live</h1>
            <p className="text-xs text-muted-foreground">{statusText}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {settings?.useLocalModel && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full mr-1">
              <Cpu className="w-3 h-3 text-purple-400" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeepSearchMode(!deepSearchMode)}
            className={deepSearchMode ? "text-green-400" : ""}
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleMute}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleVideo}>
            {isVideoOn ? <Video className="w-5 h-5 text-green-400" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          {isVideoOn && (
            <Button variant="ghost" size="icon" onClick={switchCamera}>
              <RotateCcw className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Video preview */}
        {isVideoOn && (
          <div className="absolute top-16 right-4 w-32 h-24 rounded-lg overflow-hidden shadow-lg z-10 border border-border">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
        )}

        {/* Canvas animation */}
        <div className="flex-shrink-0 h-48 relative">
          <canvas ref={canvasRef} className="w-full h-full" />
          {deepSearchMode && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500/20 rounded-full">
              <span className="text-xs text-green-400 font-medium">Deep Search Active</span>
            </div>
          )}
        </div>

        {/* Transcript panel */}
        <div className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="py-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3",
                    msg.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-card border border-border",
                  )}
                >
                  <p className="text-sm">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => {
                          setCurrentSources(msg.sources!)
                          setShowSources(true)
                        }}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Search className="w-3 h-3" />
                        View {msg.sources.length} sources
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Current transcript */}
              {transcript && jarvisState === "listening" && (
                <div className="max-w-[85%] ml-auto bg-primary/50 text-primary-foreground rounded-2xl px-4 py-3">
                  <p className="text-sm italic">{transcript}...</p>
                </div>
              )}

              {/* Current AI response */}
              {aiResponse && !messages.find((m) => m.content === aiResponse) && (
                <div className="max-w-[85%] bg-card border border-border rounded-2xl px-4 py-3">
                  <p className="text-sm">{aiResponse}</p>
                </div>
              )}

              {/* Loading */}
              {isLoading && !aiResponse && (
                <div className="max-w-[85%] bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-primary rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {showScrollButton && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute bottom-24 right-4 rounded-full shadow-lg bg-primary/90 hover:bg-primary text-primary-foreground z-10"
              onClick={() => scrollToBottom(true)}
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Swipeable sources overlay */}
        {showSources && currentSources.length > 0 && (
          <div className="absolute inset-x-0 bottom-20 px-4 z-20">
            <SwipeableSources sources={currentSources} onClose={() => setShowSources(false)} />
          </div>
        )}

        {/* Control bar */}
        <div className="flex-shrink-0 h-20 flex items-center justify-center gap-4 px-4 border-t border-border bg-card/50 backdrop-blur-sm">
          <Button
            variant={isPaused ? "default" : "outline"}
            size="lg"
            onClick={togglePause}
            className={cn("rounded-full w-14 h-14", isPaused && "bg-green-600 hover:bg-green-700")}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>

          <Button
            variant={jarvisState === "listening" ? "default" : "outline"}
            size="lg"
            className={cn(
              "rounded-full w-16 h-16",
              jarvisState === "listening" && "bg-primary animate-pulse shadow-lg shadow-primary/50",
            )}
            disabled={isPaused}
          >
            {jarvisState === "listening" ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
          </Button>

          <Button variant="outline" size="lg" onClick={() => router.push("/")} className="rounded-full w-14 h-14">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}
