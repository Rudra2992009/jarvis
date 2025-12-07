"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { JarvisOrb } from "@/components/jarvis-orb"
import { ChatInterface } from "@/components/chat-interface"
import { VoiceOverlay } from "@/components/voice-overlay"
import { SettingsPanel } from "@/components/settings-panel"
import { HistoryPanel } from "@/components/history-panel"
import { PWAInstaller } from "@/components/pwa-installer"
import { CallGuard } from "@/components/call-guard"
import { LiveChatButton } from "@/components/live-chat-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { voiceRecognition } from "@/lib/voice-recognition"
import { textToSpeech } from "@/lib/text-to-speech"
import { jarvisStorage, type JarvisSettings, type Conversation } from "@/lib/jarvis-storage"
import { Mic, Settings, MessageSquare, MicOff, Search, Send, ChevronDown } from "lucide-react"

export default function JarvisPage() {
  const [jarvisState, setJarvisState] = useState<"idle" | "listening" | "speaking" | "processing">("idle")
  const [isVoiceOverlayOpen, setIsVoiceOverlayOpen] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [settings, setSettings] = useState<JarvisSettings | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt">("prompt")
  const [isMobile, setIsMobile] = useState(false)

  const [mobileInput, setMobileInput] = useState("")
  const [mobileMessages, setMobileMessages] = useState<Array<{ role: string; content: string; id: string }>>([])
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)
  const [isMobileLoading, setIsMobileLoading] = useState(false)
  const [deepSearchMode, setDeepSearchMode] = useState(false)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const mobileChatRef = useRef<HTMLDivElement>(null)

  const handleCallStart = useCallback(() => {
    voiceRecognition.stop()
    textToSpeech.stop()
    setJarvisState("idle")
    setIsVoiceMode(false)
  }, [])

  const handleCallEnd = useCallback(() => {
    if (settings?.deviceAssistantMode) {
      voiceRecognition.start()
    }
  }, [settings])

  const handleInterrupt = useCallback(() => {
    textToSpeech.stop()
    setJarvisState("listening")
  }, [])

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions.query({ name: "microphone" as PermissionName }).then((result) => {
        setMicPermission(result.state)
        result.onchange = () => setMicPermission(result.state)
      })
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await jarvisStorage.init()
      const loadedSettings = await jarvisStorage.getSettings()
      setSettings(loadedSettings)
      textToSpeech.init()
      setIsInitialized(true)
    }
    init()
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    if (!settings || !isInitialized) return
    if (!settings.voiceActivationEnabled) return

    if (voiceRecognition.isSupported()) {
      voiceRecognition.init({
        wakeWord: settings.wakeWord,
        sleepWord: settings.sleepWord,
        onResult: (transcript, isFinal) => {
          setVoiceTranscript(transcript)
          if (isFinal) {
            setJarvisState("processing")
          }
        },
        onWakeWord: () => {
          setIsVoiceOverlayOpen(true)
          setIsVoiceMode(true)
          setJarvisState("listening")
          textToSpeech.speak("At your service, Sir.", {
            rate: settings.voiceSpeed,
            pitch: settings.voicePitch,
            onEnd: () => setJarvisState("listening"),
          })
        },
        onSleepWord: () => {
          textToSpeech.speak("Going to sleep. Call me if you need anything, Sir.", {
            rate: settings.voiceSpeed,
            pitch: settings.voicePitch,
          })
          setIsVoiceOverlayOpen(false)
          setIsVoiceMode(false)
          setJarvisState("idle")
          setVoiceTranscript("")
        },
        onInterrupt: handleInterrupt,
        onError: (error) => {
          console.error("Voice recognition error:", error)
        },
        onStateChange: (state) => {
          if (state === "idle") setJarvisState("idle")
          if (state === "listening") setJarvisState("listening")
          if (state === "processing") setJarvisState("processing")
        },
      })

      if (settings.deviceAssistantMode) {
        voiceRecognition.start()
      }
    }

    return () => {
      voiceRecognition.stop()
    }
  }, [settings, isInitialized, handleInterrupt])

  const handleSaveSettings = async (newSettings: JarvisSettings) => {
    await jarvisStorage.saveSettings(newSettings)
    setSettings(newSettings)
  }

  const toggleVoiceMode = useCallback(async () => {
    if (!settings?.voiceActivationEnabled) {
      setIsSettingsOpen(true)
      return
    }

    if (micPermission === "prompt") {
      const granted = await voiceRecognition.requestPermission()
      if (!granted) {
        alert("Microphone permission is required for voice mode.")
        return
      }
      setMicPermission("granted")
    }

    if (micPermission === "denied") {
      alert("Microphone permission was denied. Please enable it in your browser settings.")
      return
    }

    if (isVoiceMode) {
      voiceRecognition.deactivate()
      setIsVoiceMode(false)
      setJarvisState("idle")
      setVoiceTranscript("")
    } else {
      if (!voiceRecognition.isCurrentlyListening()) {
        voiceRecognition.start()
      }
      voiceRecognition.activate()
      setIsVoiceMode(true)
      setJarvisState("listening")
    }
  }, [isVoiceMode, settings, micPermission])

  const handleOrbClick = useCallback(() => {
    if (isVoiceOverlayOpen) {
      toggleVoiceMode()
    } else {
      setIsVoiceOverlayOpen(true)
    }
  }, [isVoiceOverlayOpen, toggleVoiceMode])

  const handleSelectConversation = (conversation: Conversation) => {
    console.log("Selected conversation:", conversation)
  }

  const handleMobileSend = async () => {
    if (!mobileInput.trim() || isMobileLoading) return

    const userMessage = { role: "user", content: mobileInput.trim(), id: Date.now().toString() }
    setMobileMessages((prev) => [...prev, userMessage])
    setMobileInput("")
    setIsMobileChatOpen(true)
    setIsMobileLoading(true)
    setJarvisState("processing")

    // Scroll to bottom
    setTimeout(() => {
      mobileChatRef.current?.scrollTo({ top: mobileChatRef.current.scrollHeight, behavior: "smooth" })
    }, 100)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...mobileMessages, userMessage].map((m) => ({ role: m.role, content: m.content })),
          deepSearch: deepSearchMode,
        }),
      })

      if (!response.ok) throw new Error("Failed to get response")

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader")

      const assistantId = (Date.now() + 1).toString()
      setMobileMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantId }])

      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.text) {
                fullContent += data.text
                setMobileMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)),
                )
              }
            } catch {}
          }
        }
      }

      setJarvisState("idle")
    } catch (error) {
      console.error("Mobile chat error:", error)
      setMobileMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          id: (Date.now() + 1).toString(),
        },
      ])
      setJarvisState("idle")
    } finally {
      setIsMobileLoading(false)
      setTimeout(() => {
        mobileChatRef.current?.scrollTo({ top: mobileChatRef.current.scrollHeight, behavior: "smooth" })
      }, 100)
    }
  }

  if (!isInitialized) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto flex items-center justify-center">
            <JarvisOrb state="processing" size="lg" />
          </div>
          <p className="mt-6 text-muted-foreground animate-pulse">Initializing JARVIS...</p>
        </div>
      </div>
    )
  }

  return (
    <CallGuard onCallStart={handleCallStart} onCallEnd={handleCallEnd}>
      <main className="h-screen w-screen overflow-hidden bg-background">
        {/* Desktop: Full chat interface */}
        <div className="hidden md:block h-full overflow-hidden">
          <ChatInterface
            jarvisState={jarvisState}
            setJarvisState={setJarvisState}
            isVoiceMode={isVoiceMode}
            onToggleVoice={toggleVoiceMode}
            voiceTranscript={voiceTranscript}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenHistory={() => setIsHistoryOpen(true)}
            userApiKey={settings?.useUserApiKey ? settings.userApiKey : undefined}
          />
        </div>

        <div className="md:hidden h-full flex flex-col overflow-hidden">
          {/* Header with safe area top padding */}
          <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm pt-safe">
            <h1 className="text-lg font-bold text-foreground tracking-wide">JARVIS</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 active:scale-95 transition-transform"
                onClick={() => setIsHistoryOpen(true)}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 active:scale-95 transition-transform"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main content area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Background gradient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 50% 30%, rgba(34, 211, 238, 0.06) 0%, transparent 60%)",
              }}
            />

            {!isMobileChatOpen ? (
              /* Orb view when no chat */
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div
                  className="w-36 h-36 flex items-center justify-center active:scale-95 transition-transform"
                  onClick={handleOrbClick}
                >
                  <JarvisOrb state={jarvisState} size="lg" />
                </div>

                <h2 className="mt-6 text-xl font-semibold text-foreground text-center">
                  {jarvisState === "idle" && "How can I help you?"}
                  {jarvisState === "listening" && "Listening..."}
                  {jarvisState === "speaking" && "Speaking..."}
                  {jarvisState === "processing" && "Processing..."}
                </h2>

                <p className="mt-2 text-muted-foreground text-center text-sm">Type below or tap mic to speak</p>

                {voiceTranscript && isVoiceMode && (
                  <div className="mt-4 p-3 bg-card/50 rounded-lg border border-border max-w-xs">
                    <p className="text-foreground italic text-center text-sm">"{voiceTranscript}"</p>
                  </div>
                )}
              </div>
            ) : (
              /* Chat messages view */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat header with collapse button */}
                <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-card/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6">
                      <JarvisOrb state={jarvisState} size="sm" />
                    </div>
                    <span className="text-sm font-medium">Chat</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 active:scale-95 transition-transform"
                    onClick={() => setIsMobileChatOpen(false)}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* Messages with momentum scrolling for iOS/Android */}
                <div
                  ref={mobileChatRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 overscroll-contain"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {mobileMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content || (isMobileLoading && msg.role === "assistant" ? "..." : "")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-shrink-0 border-t border-border bg-card/90 backdrop-blur-sm p-3 pb-safe-bottom">
            <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1 border border-border">
              {/* Deep Search toggle */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full flex-shrink-0 active:scale-95 transition-transform ${deepSearchMode ? "bg-green-500/20 text-green-500" : "text-muted-foreground"}`}
                onClick={() => setDeepSearchMode(!deepSearchMode)}
              >
                <Search className="w-4 h-4" />
              </Button>

              {/* Input field */}
              <Input
                ref={mobileInputRef}
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleMobileSend()}
                placeholder={deepSearchMode ? "Search the web..." : "Ask your doubts here..."}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base h-9 px-2"
                disabled={isMobileLoading}
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="on"
              />

              {/* Mic button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-full flex-shrink-0 active:scale-95 transition-transform ${isVoiceMode ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}
                onClick={async () => {
                  if (settings?.voiceActivationEnabled) {
                    if (micPermission === "prompt") {
                      const granted = await voiceRecognition.requestPermission()
                      if (granted) setMicPermission("granted")
                    }
                    if (micPermission !== "denied") {
                      voiceRecognition.start()
                      voiceRecognition.activate()
                      setIsVoiceMode(true)
                      setJarvisState("listening")
                    }
                  } else {
                    setIsSettingsOpen(true)
                  }
                }}
              >
                {isVoiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </Button>

              {/* Live Chat button */}
              <LiveChatButton className="h-9 w-9 rounded-full flex-shrink-0 active:scale-95 transition-transform" />

              {/* Send button - only show when there's input */}
              {mobileInput.trim() && (
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 rounded-full flex-shrink-0 bg-primary text-primary-foreground active:scale-95 transition-transform"
                  onClick={handleMobileSend}
                  disabled={isMobileLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  settings?.deviceAssistantMode
                    ? "bg-green-500 animate-pulse"
                    : deepSearchMode
                      ? "bg-green-500"
                      : "bg-muted-foreground/50"
                }`}
              />
              <span className="text-[10px] text-muted-foreground">
                {isMobileLoading
                  ? "Processing..."
                  : deepSearchMode
                    ? "Deep Search On"
                    : settings?.deviceAssistantMode
                      ? "Always Listening"
                      : "Ready"}
              </span>
            </div>
          </div>
        </div>

        <VoiceOverlay
          isOpen={isVoiceOverlayOpen}
          onClose={() => {
            setIsVoiceOverlayOpen(false)
            setIsVoiceMode(false)
            voiceRecognition.deactivate()
            setJarvisState("idle")
            setVoiceTranscript("")
          }}
          jarvisState={jarvisState}
          setJarvisState={setJarvisState}
          voiceTranscript={voiceTranscript}
          onToggleVoice={toggleVoiceMode}
          isVoiceMode={isVoiceMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          userApiKey={settings?.useUserApiKey ? settings.userApiKey : undefined}
        />

        {settings && (
          <SettingsPanel
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}

        <HistoryPanel
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          onSelectConversation={handleSelectConversation}
        />

        <PWAInstaller />
      </main>
    </CallGuard>
  )
}
