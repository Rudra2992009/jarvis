"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Download, Trash2, Bot } from "lucide-react"
import { type JarvisSettings, type LocalModel, jarvisStorage } from "@/lib/jarvis-storage"
import { textToSpeech } from "@/lib/text-to-speech"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  settings: JarvisSettings
  onSettingsChange: (settings: JarvisSettings) => void
}

// Mock data for availableModels and downloadedModels for the update
// In a real scenario, these would likely be managed via state or props.
const availableModels: { id: string; name: string; description: string; size: string; type: string }[] = [
  {
    id: "model-1",
    name: "Llama 3 8B Instruct",
    description: "A powerful language model.",
    size: "4.7 GB",
    type: "text",
  },
  {
    id: "model-2",
    name: "Mistral 7B Instruct",
    description: "Efficient and performant model.",
    size: "4.1 GB",
    type: "text",
  },
  { id: "model-3", name: "Stable Diffusion XL", description: "Image generation model.", size: "7.8 GB", type: "image" },
]
const downloadedModels: LocalModel[] = [] // Assuming this is managed elsewhere and reflects actual downloaded models

export function SettingsPanel({ isOpen, onClose, settings, onSettingsChange }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<JarvisSettings>(settings)
  const [newApiKey, setNewApiKey] = useState("")
  const [testingVoice, setTestingVoice] = useState(false)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("")
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<number>(0) // Added for download progress
  const [localModels, setLocalModels] = useState<LocalModel[]>([])

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  useEffect(() => {
    const loadVoices = () => {
      const voices = textToSpeech.getVoices()
      const indianVoices = voices.filter((v) => v.lang === "en-IN" || v.lang === "hi-IN")
      const otherEnglishVoices = voices.filter((v) => v.lang.startsWith("en") && v.lang !== "en-IN")
      setAvailableVoices([...indianVoices, ...otherEnglishVoices])

      const preferred = textToSpeech.getPreferredVoice()
      if (preferred) {
        setSelectedVoiceName(preferred.name)
      }
    }

    loadVoices()
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  useEffect(() => {
    const loadModels = async () => {
      const models = await jarvisStorage.getLocalModels()
      setLocalModels(models)
    }
    loadModels()
  }, [])

  if (!isOpen) return null

  const handleSave = () => {
    onSettingsChange(localSettings)
    onClose()
  }

  const addApiKey = () => {
    if (newApiKey.trim() && newApiKey.startsWith("AIza")) {
      setLocalSettings({
        ...localSettings,
        userApiKey: newApiKey.trim(),
        useUserApiKey: true,
      })
      setNewApiKey("")
    }
  }

  const testVoice = () => {
    setTestingVoice(true)
    textToSpeech.speak(
      "Good day, Sir. I am JARVIS, your personal artificial intelligence assistant created by Rudra Pandey. How may I assist you today?",
      {
        rate: localSettings.voiceSpeed,
        pitch: localSettings.voicePitch,
        onEnd: () => setTestingVoice(false),
      },
    )
  }

  const handleVoiceChange = (voiceName: string) => {
    const voice = availableVoices.find((v) => v.name === voiceName)
    if (voice) {
      textToSpeech.setPreferredVoice(voice)
      setSelectedVoiceName(voiceName)
      // Update settings for voice name as well if it's part of JarvisSettings
      // onSettingsChange({ ...settings, selectedVoiceName: voice.name });
    }
  }

  const handleDownloadModel = (model: {
    id: string
    name: string
    description: string
    size: string
    type: string
  }) => {
    // In a real implementation, this would trigger a download and update downloadProgress
    console.log(`Initiating download for model: ${model.id}`)
    setDownloadingModel(model.id)
    setDownloadProgress(0) // Reset progress

    // Simulate download progress
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setDownloadingModel(null) // Reset downloading state
          // Assuming successful download, add to local models
          setLocalModels((prev) => [
            ...prev,
            { id: model.id, name: model.name, size: Number.parseFloat(model.size) * 1024 * 1024, format: model.type },
          ]) // Approximate size conversion
          return 0
        }
        return prev + 10 // Increment progress
      })
    }, 300)
  }

  const handleDeleteModel = async (modelId: string) => {
    await jarvisStorage.deleteLocalModel(modelId)
    setLocalModels((prev) => prev.filter((m) => m.id !== modelId))
    if (settings.selectedLocalModel === modelId) {
      onSettingsChange({ ...settings, selectedLocalModel: undefined, useLocalModel: false })
    }
  }

  const handleImportModel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0]
      const model = await jarvisStorage.importModelFromFile(file) // Assuming jarvisStorage handles file import
      if (model) {
        setLocalModels((prev) => [...prev, model])
      }
      event.target.value = "" // Clear the file input
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
          <CardTitle className="text-foreground text-base sm:text-xl">Configure JARVIS</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <ScrollArea className="h-[70vh] sm:h-[60vh]">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4 h-auto">
                <TabsTrigger value="general" className="text-xs sm:text-sm py-2">
                  General
                </TabsTrigger>
                <TabsTrigger value="voice" className="text-xs sm:text-sm py-2">
                  Voice
                </TabsTrigger>
                <TabsTrigger value="models" className="text-xs sm:text-sm py-2">
                  Models
                </TabsTrigger>
                <TabsTrigger value="about" className="text-xs sm:text-sm py-2">
                  About
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 sm:space-y-6">
                {/* Theme Selection */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-foreground text-xs sm:text-sm font-medium">Theme</Label>
                  <Select
                    value={settings.theme}
                    onValueChange={(value: "dark" | "light" | "system") =>
                      onSettingsChange({ ...settings, theme: value })
                    }
                  >
                    <SelectTrigger className="bg-input border-border text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark" className="text-xs sm:text-sm">
                        Dark
                      </SelectItem>
                      <SelectItem value="light" className="text-xs sm:text-sm">
                        Light
                      </SelectItem>
                      <SelectItem value="system" className="text-xs sm:text-sm">
                        System
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Language Selection */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-foreground text-xs sm:text-sm font-medium">Language</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(value) => onSettingsChange({ ...settings, language: value })}
                  >
                    <SelectTrigger className="bg-input border-border text-xs sm:text-sm h-9 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US" className="text-xs sm:text-sm">
                        English (US)
                      </SelectItem>
                      <SelectItem value="en-GB" className="text-xs sm:text-sm">
                        English (UK)
                      </SelectItem>
                      <SelectItem value="hi-IN" className="text-xs sm:text-sm">
                        Hindi
                      </SelectItem>
                      <SelectItem value="es-ES" className="text-xs sm:text-sm">
                        Spanish
                      </SelectItem>
                      <SelectItem value="fr-FR" className="text-xs sm:text-sm">
                        French
                      </SelectItem>
                      <SelectItem value="de-DE" className="text-xs sm:text-sm">
                        German
                      </SelectItem>
                      <SelectItem value="ja-JP" className="text-xs sm:text-sm">
                        Japanese
                      </SelectItem>
                      <SelectItem value="zh-CN" className="text-xs sm:text-sm">
                        Chinese
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Auto-save toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-xs sm:text-sm font-medium">Auto-save Conversations</Label>
                    <p className="text-xs text-muted-foreground">Automatically save chat history</p>
                  </div>
                  <Switch
                    checked={settings.autoSave}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, autoSave: checked })}
                  />
                </div>

                {/* Notifications toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-xs sm:text-sm font-medium">Notifications</Label>
                    <p className="text-xs text-muted-foreground">Enable push notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, notifications: checked })}
                  />
                </div>

                {/* Haptic Feedback toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-xs sm:text-sm font-medium">Haptic Feedback</Label>
                    <p className="text-xs text-muted-foreground">Vibration on interactions</p>
                  </div>
                  <Switch
                    checked={settings.hapticFeedback}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, hapticFeedback: checked })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="voice" className="space-y-4 sm:space-y-6">
                {/* Voice Speed */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-foreground text-xs sm:text-sm font-medium">
                    Voice Speed: {settings.voiceSpeed}x
                  </Label>
                  <Slider
                    value={[settings.voiceSpeed]}
                    onValueChange={([value]) => onSettingsChange({ ...settings, voiceSpeed: value })}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Voice Pitch */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-foreground text-xs sm:text-sm font-medium">
                    Voice Pitch: {settings.voicePitch}x
                  </Label>
                  <Slider
                    value={[settings.voicePitch]}
                    onValueChange={([value]) => onSettingsChange({ ...settings, voicePitch: value })}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Continuous Listening toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-xs sm:text-sm font-medium">Continuous Listening</Label>
                    <p className="text-xs text-muted-foreground">Keep microphone active</p>
                  </div>
                  <Switch
                    checked={settings.continuousListening}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, continuousListening: checked })}
                  />
                </div>

                {/* Sound Effects toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-xs sm:text-sm font-medium">Sound Effects</Label>
                    <p className="text-xs text-muted-foreground">Play sounds for interactions</p>
                  </div>
                  <Switch
                    checked={settings.soundEffects}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, soundEffects: checked })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="models" className="space-y-4 sm:space-y-6">
                {/* Use Local Model toggle */}
                <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-xs sm:text-sm font-medium">Use Local Model</Label>
                    <p className="text-xs text-muted-foreground">Run AI locally on device</p>
                  </div>
                  <Switch
                    checked={settings.useLocalModel}
                    onCheckedChange={(checked) => onSettingsChange({ ...settings, useLocalModel: checked })}
                  />
                </div>

                {/* Available Models */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-foreground text-xs sm:text-sm font-medium">Available Models</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Download models to use AI offline. Models are stored locally.
                  </p>

                  <div className="space-y-2 max-h-[40vh] sm:max-h-[50vh] overflow-y-auto pr-2">
                    {availableModels.map((model) => {
                      const isDownloaded = localModels.some((m) => m.id === model.id) // Use localModels from state
                      const isCurrentlyDownloading = downloadingModel === model.id

                      return (
                        <div
                          key={model.id}
                          className="flex items-center justify-between p-2 sm:p-3 rounded-lg bg-background border border-border"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="font-medium text-foreground text-xs sm:text-sm truncate">{model.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{model.description}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                {model.size}
                              </span>
                              <span className="text-xs text-muted-foreground capitalize">{model.type}</span>
                            </div>
                          </div>
                          {isDownloaded ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteModel(model.id)}
                              className="text-destructive hover:text-destructive text-xs h-8"
                            >
                              <Trash2 className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          ) : isCurrentlyDownloading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 sm:w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-300"
                                  style={{ width: `${downloadProgress}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{downloadProgress}%</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadModel(model)}
                              className="text-xs h-8"
                            >
                              <Download className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Download</span>
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Import Model */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-foreground text-xs sm:text-sm font-medium">Import Custom Model</Label>
                  <p className="text-xs text-muted-foreground">Import GGUF, SafeTensors, BIN, CKPT, ONNX models</p>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="*"
                      onChange={handleImportModel}
                      className="bg-input border-border text-xs sm:text-sm h-9 sm:h-10"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="about" className="space-y-4 sm:space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">JARVIS AI</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">Version 2.0.0</p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                    Your personal AI assistant with voice recognition, image generation, and local model support.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 rounded bg-muted">PWA Support</span>
                    <span className="px-2 py-1 rounded bg-muted">Voice Control</span>
                    <span className="px-2 py-1 rounded bg-muted">Local Models</span>
                    <span className="px-2 py-1 rounded bg-muted">Deep Search</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
