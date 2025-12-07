"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { JarvisOrb } from "./jarvis-orb"
import { LiveChatButton } from "@/components/live-chat-button"
import { SwipeableSources } from "@/components/swipeable-sources"
import { Maximize2 } from "lucide-react"
import { MessageSquare, ImageIcon } from "lucide-react"
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  History,
  X,
  Copy,
  Check,
  Search,
  Globe,
  ChevronDown,
  Cpu,
  Download,
} from "lucide-react"
import { textToSpeech } from "@/lib/text-to-speech"
import { jarvisStorage, type Conversation, type JarvisSettings, type LocalModel } from "@/lib/jarvis-storage"
import { useRouter } from "next/navigation"
import { copyToClipboard } from "@/lib/copy-to-clipboard"

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
  sources?: Array<{ name: string; url: string; icon: string }>
  images?: Array<{
    url: string
    source?: string
    isAIGenerated?: boolean
    isLoading?: boolean
    error?: boolean
  }>
}

interface ChatInterfaceProps {
  isOverlay?: boolean
  onClose?: () => void
  jarvisState: "idle" | "listening" | "speaking" | "processing"
  setJarvisState: (state: "idle" | "listening" | "speaking" | "processing") => void
  isVoiceMode?: boolean
  onToggleVoice?: () => void
  voiceTranscript?: string
  onOpenSettings?: () => void
  onOpenHistory?: () => void
  userApiKey?: string
}

function SourceIconsCompact({ sources, onExpand }: { sources: Source[]; onExpand: () => void }) {
  const uniqueSources = sources.reduce((acc: Source[], curr) => {
    if (!acc.find((s) => s.source === curr.source)) acc.push(curr)
    return acc
  }, [])

  const displaySources = uniqueSources.slice(0, 3)
  const remaining = uniqueSources.length - 3

  return (
    <div className="mt-2 flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Sources:</span>
      {displaySources.map((source, idx) => (
        <button
          key={idx}
          onClick={onExpand}
          className="w-6 h-6 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-all hover:scale-110 ring-1 ring-border"
          title={`${source.source} - Click to expand`}
        >
          <img
            src={source.favicon || "/placeholder.svg"}
            alt={source.source}
            className="w-4 h-4 rounded-sm"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = "/abstract-web.png"
            }}
          />
        </button>
      ))}
      {remaining > 0 && (
        <button
          onClick={onExpand}
          className="w-6 h-6 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-xs font-medium text-primary transition-all hover:scale-110 ring-1 ring-primary/30"
          title={`+${remaining} more sources - Click to expand`}
        >
          +{remaining}
        </button>
      )}
    </div>
  )
}

function renderMarkdown(text: string) {
  // Process markdown to HTML-like React elements
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeContent = ""
  let codeLanguage = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block handling
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeLanguage = line.slice(3).trim()
        codeContent = ""
      } else {
        inCodeBlock = false
        elements.push(
          <pre key={`code-${i}`} className="bg-muted rounded-lg p-3 my-2 overflow-x-auto text-xs">
            <code className={`language-${codeLanguage}`}>{codeContent.trim()}</code>
          </pre>,
        )
      }
      continue
    }

    if (inCodeBlock) {
      codeContent += line + "\n"
      continue
    }

    // Process inline elements
    let processedLine = line

    // Bold: **text** or __text__
    processedLine = processedLine.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    processedLine = processedLine.replace(/__(.+?)__/g, "<strong>$1</strong>")

    // Italic: *text* or _text_
    processedLine = processedLine.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    processedLine = processedLine.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>")

    // Inline code: `code`
    processedLine = processedLine.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')

    // Links: [text](url)
    processedLine = processedLine.replace(
      /\[([^\]]+)\]$$([^)]+)$$/g,
      '<a href="$2" target="_blank" class="text-primary underline">$1</a>',
    )

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-base font-semibold mt-3 mb-1"
          dangerouslySetInnerHTML={{ __html: processedLine.slice(4) }}
        />,
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-lg font-semibold mt-3 mb-1"
          dangerouslySetInnerHTML={{ __html: processedLine.slice(3) }}
        />,
      )
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-xl font-bold mt-3 mb-2"
          dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }}
        />,
      )
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      // Bullet points
      elements.push(
        <li key={`li-${i}`} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: processedLine.slice(2) }} />,
      )
    } else if (/^\d+\.\s/.test(line)) {
      // Numbered list
      elements.push(
        <li
          key={`li-${i}`}
          className="ml-4 list-decimal"
          dangerouslySetInnerHTML={{ __html: processedLine.replace(/^\d+\.\s/, "") }}
        />,
      )
    } else if (line.trim() === "") {
      elements.push(<br key={`br-${i}`} />)
    } else {
      elements.push(<p key={`p-${i}`} className="my-1" dangerouslySetInnerHTML={{ __html: processedLine }} />)
    }
  }

  return <div className="text-sm leading-relaxed">{elements}</div>
}

export function ChatInterface({
  isOverlay = false,
  onClose,
  jarvisState,
  setJarvisState,
  isVoiceMode = false,
  onToggleVoice,
  voiceTranscript,
  onOpenSettings,
  onOpenHistory,
  userApiKey,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deepSearchMode, setDeepSearchMode] = useState(false)
  const [currentConversationId] = useState(() => crypto.randomUUID())
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [expandedSourcesId, setExpandedSourcesId] = useState<string | null>(null)
  const [settings, setSettings] = useState<JarvisSettings | null>(null)
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const lastSpokenRef = useRef<string>("")
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [showGenerateCommand, setShowGenerateCommand] = useState(false)
  const [generateCommandType, setGenerateCommandType] = useState<string | null>(null)
  const [downloadedModels, setDownloadedModels] = useState<LocalModel[]>([])
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  useEffect(() => {
    jarvisStorage.getSettings().then(setSettings)
  }, [])

  useEffect(() => {
    const loadModels = async () => {
      const models = await jarvisStorage.getLocalModels()
      setDownloadedModels(models)
    }
    loadModels()
  }, [])

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
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (voiceTranscript && isVoiceMode) {
      setInputValue(voiceTranscript)
    }
  }, [voiceTranscript, isVoiceMode])

  const submitTimeoutRef = useRef<NodeJS.Timeout>()
  useEffect(() => {
    if (voiceTranscript && isVoiceMode && !isLoading && jarvisState === "processing") {
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current)
      submitTimeoutRef.current = setTimeout(() => {
        if (voiceTranscript.trim()) {
          handleSendMessage(voiceTranscript)
          setInputValue("")
        }
      }, 500)
    }
    return () => {
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current)
    }
  }, [voiceTranscript, isVoiceMode, isLoading, jarvisState])

  useEffect(() => {
    if (messages.length > 0) {
      const conversation: Conversation = {
        id: currentConversationId,
        title: messages[0]?.content.slice(0, 50) || "New Conversation",
        messages: messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      jarvisStorage.saveConversation(conversation)
    }
  }, [messages, currentConversationId])

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    setJarvisState("processing")

    abortControllerRef.current = new AbortController()

    try {
      console.log("[v0] Sending message with deepSearch:", deepSearchMode, "localModel:", settings?.useLocalModel)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parts: [{ type: "text", text: m.content }],
          })),
          userApiKey: settings?.userApiKey || userApiKey,
          isLiveMode: false,
          deepSearch: deepSearchMode,
          useLocalModel: settings?.useLocalModel,
          selectedLocalModel: settings?.selectedLocalModel,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[v0] API error:", errorData)
        throw new Error(errorData.error || "Failed to get response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ""
      let assistantSources: Source[] = []
      const assistantId = (Date.now() + 1).toString()

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", timestamp: Date.now(), isDeepSearch: deepSearchMode },
      ])

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
                  assistantSources = data.sources
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, sources: assistantSources } : m)),
                  )
                }
                if (data.type === "text-delta" && data.textDelta) {
                  assistantContent += data.textDelta
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId ? { ...m, content: assistantContent, sources: assistantSources } : m,
                    ),
                  )
                }
              } catch {}
            }
          }
        }
      }

      if (assistantContent && !isMuted) {
        lastSpokenRef.current = assistantContent
        setJarvisState("speaking")
        textToSpeech.speak(assistantContent, {
          onEnd: () => setJarvisState(isVoiceMode ? "listening" : "idle"),
        })
      } else {
        setJarvisState(isVoiceMode ? "listening" : "idle")
      }
    } catch (error: any) {
      if (error.name === "AbortError") return
      console.error("Chat error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, Sir. Something went wrong. Please try again.",
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setJarvisState("idle")
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const parseGenerateCommand = (
    input: string,
  ): { type: "text" | "image" | "code" | "audio" | "search"; prompt: string } | null => {
    const lower = input.toLowerCase().trim()

    // /generate image <prompt> - AI generation using Gemini
    if (lower.startsWith("/generate image ")) {
      return { type: "image", prompt: input.slice(16).trim() }
    }
    // /generate <prompt> - defaults to image if no type specified
    if (
      lower.startsWith("/generate ") &&
      !lower.startsWith("/generate text ") &&
      !lower.startsWith("/generate code ") &&
      !lower.startsWith("/generate audio ")
    ) {
      return { type: "image", prompt: input.slice(10).trim() }
    }
    // /image <prompt> - search from integrated sources (Lexica, Unsplash, etc.)
    if (lower.startsWith("/image ")) {
      return { type: "search", prompt: input.slice(7).trim() }
    }
    // /generate text <prompt>
    if (lower.startsWith("/generate text ")) {
      return { type: "text", prompt: input.slice(15).trim() }
    }
    // /generate code <prompt>
    if (lower.startsWith("/generate code ")) {
      return { type: "code", prompt: input.slice(15).trim() }
    }
    // /generate audio <prompt>
    if (lower.startsWith("/generate audio ")) {
      return { type: "audio", prompt: input.slice(16).trim() }
    }

    return null
  }

  const handleGenerate = async (type: string, prompt: string) => {
    if (!prompt.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: type === "search" ? `/image ${prompt}` : `/generate ${type} ${prompt}`,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)
    setJarvisState("processing")

    try {
      if (type === "image" || type === "search") {
        const assistantId = (Date.now() + 1).toString()

        const loadingImages = Array(4)
          .fill(null)
          .map((_, i) => ({
            url: "",
            source: type === "search" ? "Searching..." : "Generating...",
            isAIGenerated: type === "image",
            isLoading: true,
          }))

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content:
              type === "search" ? `Searching images for "${prompt}"...` : `Generating AI images for "${prompt}"...`,
            timestamp: Date.now(),
            images: loadingImages,
          },
        ])

        // Use different endpoint based on type
        const endpoint = type === "search" ? "/api/image-search" : "/api/generate-image"

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, count: 4 }),
        })

        if (response.ok) {
          const data = await response.json()

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      type === "search"
                        ? `Found ${data.images?.length || 0} images for "${prompt}":`
                        : `Generated ${data.aiGenerated || data.images?.length || 0} AI images for "${prompt}":`,
                    images: (data.images || []).map(
                      (img: { url: string; source: string; isAIGenerated?: boolean }) => ({
                        ...img,
                        isLoading: false,
                        isAIGenerated: type === "image" ? true : img.isAIGenerated || false,
                      }),
                    ),
                  }
                : m,
            ),
          )
        } else {
          // Fallback images for search if the API fails
          if (type === "search") {
            const fallbackImages = [
              {
                url: `https://source.unsplash.com/512x512/?${encodeURIComponent(prompt)}&sig=${Date.now()}`,
                source: "Unsplash",
                isAIGenerated: false,
                isLoading: false,
              },
              {
                url: `https://loremflickr.com/512/512/${encodeURIComponent(prompt.split(" ").slice(0, 3).join(","))}?random=${Date.now()}`,
                source: "LoremFlickr",
                isAIGenerated: false,
                isLoading: false,
              },
              {
                url: `https://picsum.photos/seed/${encodeURIComponent(prompt)}-1/512/512`,
                source: "Picsum",
                isAIGenerated: false,
                isLoading: false,
              },
              {
                url: `https://picsum.photos/seed/${encodeURIComponent(prompt)}-2/512/512`,
                source: "Picsum",
                isAIGenerated: false,
                isLoading: false,
              },
            ]
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: `Found images related to "${prompt}":`,
                      images: fallbackImages,
                    }
                  : m,
              ),
            )
          } else {
            throw new Error("Failed to get images")
          }
        }
      } else if (type === "text") {
        await handleSendMessage(prompt)
        return
      } else if (type === "code") {
        const assistantId = (Date.now() + 1).toString()
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: `Code generation is temporarily unavailable. Please ask me to write code in the chat instead.`,
            timestamp: Date.now(),
          },
        ])
        setJarvisState("idle")
      } else if (type === "audio") {
        const assistantId = (Date.now() + 1).toString()
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: `Audio generation is coming soon. For now, I can help you with text and image generation.`,
            timestamp: Date.now(),
          },
        ])
        setJarvisState("idle")
      }
    } catch (error) {
      console.error("Generation error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsLoading(false)
      setJarvisState("idle")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (value.toLowerCase().startsWith("/generate") || value.toLowerCase().startsWith("/image")) {
      setShowGenerateCommand(true)
      const parsed = parseGenerateCommand(value)
      setGenerateCommandType(parsed?.type || null)
    } else {
      setShowGenerateCommand(false)
      setGenerateCommandType(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    if (inputValue.toLowerCase().startsWith("/generate") || inputValue.toLowerCase().startsWith("/image")) {
      const parsed = parseGenerateCommand(inputValue)
      if (parsed && parsed.type && parsed.prompt) {
        handleGenerate(parsed.type, parsed.prompt)
        return
      }
    }

    textToSpeech.stop()
    handleSendMessage(inputValue)
  }

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted)
    if (!isMuted) textToSpeech.stop()
  }, [isMuted])

  const toggleDeepSearch = useCallback(() => {
    setDeepSearchMode(!deepSearchMode)
  }, [deepSearchMode])

  const handleImageClick = (url: string) => {
    setLightboxImage(url)
  }

  const closeLightbox = () => {
    setLightboxImage(null)
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background/95 backdrop-blur-xl overflow-hidden",
        isOverlay ? "h-full rounded-l-2xl border-l border-border shadow-2xl" : "h-screen",
      )}
    >
      {/* Header */}
      <header className="flex-shrink-0 h-16 flex items-center justify-between px-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <JarvisOrb state={jarvisState} size="sm" showParticles={false} />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">JARVIS</h2>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Processing..."
                : jarvisState === "listening"
                  ? "Listening..."
                  : jarvisState === "speaking"
                    ? "Speaking..."
                    : settings?.useLocalModel
                      ? "Local Model"
                      : "Ready to assist"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {settings?.useLocalModel && (
            <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 rounded-full mr-1">
              <Cpu className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium">Local</span>
            </div>
          )}
          {deepSearchMode && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded-full mr-1">
              <Globe className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium">Deep Search</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenHistory}
            className="text-muted-foreground hover:text-foreground"
            title="History"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          {isOverlay && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 relative min-h-0">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-32 h-32 flex items-center justify-center">
                  <JarvisOrb state={jarvisState} size="lg" />
                </div>
                <h3 className="mt-6 text-lg font-medium text-foreground">Good day, Sir. How may I assist you?</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                  {isVoiceMode
                    ? "I'm listening. Just speak your request."
                    : "Type a message or enable voice mode to get started."}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {["What can you do?", "Tell me a joke", "Search for latest news"].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-transparent"
                      onClick={() => handleSendMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                      <span className="text-xs font-bold text-primary-foreground">J</span>
                    </div>
                  </div>
                )}
                <div className="max-w-[80%]">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 relative group",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-card border border-border text-card-foreground",
                    )}
                  >
                    {message.role === "assistant" ? (
                      renderMarkdown(message.content)
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    )}
                    {message.role === "assistant" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => copyToClipboard(message.content, message.id)}
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                  </div>
                  {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                    <>
                      {expandedSourcesId === message.id ? (
                        <SwipeableSources sources={message.sources} onClose={() => setExpandedSourcesId(null)} />
                      ) : (
                        <SourceIconsCompact
                          sources={message.sources}
                          onExpand={() => setExpandedSourcesId(message.id)}
                        />
                      )}
                    </>
                  )}
                  {message.images && message.images.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">Found Images:</p>
                      <div className="grid grid-cols-2 gap-3">
                        {message.images.map((img, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="relative rounded-xl overflow-hidden bg-muted/50 border border-border/50 aspect-square group cursor-pointer"
                            onClick={() => !img.isLoading && !img.error && setLightboxImage(img.url)}
                          >
                            {img.isLoading ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse">
                                <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                                <span className="text-sm text-muted-foreground">Generating...</span>
                              </div>
                            ) : img.error ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10">
                                <ImageIcon className="w-8 h-8 text-destructive/60 mb-2" />
                                <span className="text-xs text-destructive">Image unavailable</span>
                              </div>
                            ) : (
                              <>
                                <img
                                  src={img.url || "/placeholder.svg"}
                                  alt={`Image ${imgIdx + 1}`}
                                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-110"
                                  onLoad={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.style.opacity = "1"
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = `https://picsum.photos/seed/fallback-${Date.now()}-${imgIdx}/512/512`
                                  }}
                                  style={{ opacity: 0, transition: "opacity 0.3s" }}
                                  loading="eager"
                                />
                                {/* Overlay with source info */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="text-xs text-white/90 font-medium">
                                          {img.source || "Image"}
                                        </span>
                                        {img.isAIGenerated && (
                                          <span className="ml-2 text-[10px] bg-purple-500 px-1.5 py-0.5 rounded-full text-white">
                                            AI
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setLightboxImage(img.url)
                                          }}
                                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                          title="View full size"
                                        >
                                          <Maximize2 className="w-3.5 h-3.5 text-white" />
                                        </button>
                                        <a
                                          href={img.url}
                                          download={`jarvis-image-${imgIdx + 1}.png`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                          title="Download"
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <Download className="w-3.5 h-3.5 text-white" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {/* Always visible badge */}
                                <div className="absolute top-2 left-2">
                                  <span className="text-[10px] bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full">
                                    {imgIdx + 1}/{message.images?.length}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="text-xs font-bold text-primary-foreground">J</span>
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
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
              </div>
            )}
          </div>
        </ScrollArea>

        {showScrollButton && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg bg-primary/90 hover:bg-primary text-primary-foreground z-10"
            onClick={() => scrollToBottom(true)}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Voice transcript */}
      <div className="flex-shrink-0 h-10 px-4 flex items-center bg-card/50 border-t border-border">
        {isVoiceMode && voiceTranscript ? (
          <div className="flex items-center gap-2 w-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
            <p className="text-sm text-muted-foreground italic flex-1 truncate">"{voiceTranscript}"</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/50">{isVoiceMode ? "Listening for your voice..." : ""}</span>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t border-border bg-card/50 relative">
        {showGenerateCommand && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-10 max-h-80 overflow-y-auto">
            <div className="p-2 border-b border-border bg-muted/50">
              <p className="text-xs text-muted-foreground font-medium">Generate Commands</p>
            </div>

            {/* Text Generation */}
            <button
              type="button"
              onClick={() => {
                setInputValue("/generate text ")
                setGenerateCommandType("text")
              }}
              className={`w-full px-4 py-3 text-left hover:bg-primary/10 flex items-center gap-3 transition-colors ${generateCommandType === "text" ? "bg-primary/10" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">/generate text</p>
                <p className="text-xs text-muted-foreground">Generate text using AI model</p>
              </div>
              {downloadedModels.filter((m) => m.type === "text").length > 0 && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                  {downloadedModels.filter((m) => m.type === "text").length} models
                </span>
              )}
            </button>

            {/* Image Generation */}
            <button
              type="button"
              onClick={() => {
                setInputValue("/generate image ")
                setGenerateCommandType("image")
              }}
              className={`w-full px-4 py-3 text-left hover:bg-primary/10 flex items-center gap-3 transition-colors ${generateCommandType === "image" ? "bg-primary/10" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">/generate image</p>
                <p className="text-xs text-muted-foreground">Generate images using free AI services</p>
              </div>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Free AI</span>
            </button>

            {/* Audio Generation */}
            <button
              type="button"
              onClick={() => {
                setInputValue("/generate audio ")
                setGenerateCommandType("audio")
              }}
              className={`w-full px-4 py-3 text-left hover:bg-primary/10 flex items-center gap-3 transition-colors ${generateCommandType === "audio" ? "bg-primary/10" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">/generate audio</p>
                <p className="text-xs text-muted-foreground">Audio generation (coming soon)</p>
              </div>
            </button>

            {/* Image Search */}
            <button
              type="button"
              onClick={() => {
                setInputValue("/image ")
                setGenerateCommandType("search")
              }}
              className={`w-full px-4 py-3 text-left hover:bg-primary/10 flex items-center gap-3 transition-colors ${generateCommandType === "search" ? "bg-primary/10" : ""}`}
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">/image</p>
                <p className="text-xs text-muted-foreground">Search images from integrated sources</p>
              </div>
              <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded">Integrated Sources</span>
            </button>

            {/* Auto Detection */}
            <div className="p-2 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Tip: Just type <code className="bg-muted px-1 rounded">/generate your prompt</code> or{" "}
                <code className="bg-muted px-1 rounded">/image your prompt</code> and JARVIS will auto-detect the type
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <Button
            type="button"
            variant={isVoiceMode ? "default" : "outline"}
            size="icon"
            onClick={onToggleVoice}
            className={cn(
              "transition-all flex-shrink-0",
              isVoiceMode && "bg-primary text-primary-foreground shadow-lg shadow-primary/30",
            )}
            title={isVoiceMode ? "Disable voice mode" : "Enable voice mode"}
          >
            {isVoiceMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          <LiveChatButton className="flex-shrink-0" />

          <Button
            type="button"
            variant={deepSearchMode ? "default" : "outline"}
            size="icon"
            onClick={toggleDeepSearch}
            className={cn(
              "transition-all flex-shrink-0",
              deepSearchMode && "bg-green-600 text-white shadow-lg shadow-green-500/30",
            )}
            title={deepSearchMode ? "Disable deep search" : "Enable deep search"}
          >
            <Search className="w-4 h-4" />
          </Button>

          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            placeholder={deepSearchMode ? "Search the web..." : "Message JARVIS... (try /generate image)"}
            className="flex-1 bg-background border-muted-foreground/20 focus-visible:ring-primary"
            disabled={isLoading}
          />

          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={lightboxImage || "/placeholder.svg"}
            alt="Full size preview"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={(e) => {
                e.stopPropagation()
                const a = document.createElement("a")
                a.href = lightboxImage
                a.download = `jarvis-image-${Date.now()}.png`
                a.click()
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(lightboxImage)
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
