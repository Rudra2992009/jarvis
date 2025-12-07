export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  audioUrl?: string
  sources?: Array<{ name: string; url: string; icon: string }>
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export type LocalModel = {
  id: string
  name: string
  filename: string
  size: number
  format:
    | "gguf"
    | "safetensors"
    | "bin"
    | "ckpt"
    | "pt"
    | "pth"
    | "onnx"
    | "tflite"
    | "h5"
    | "pb"
    | "mlmodel"
    | "torchscript"
    | "keras"
    | "mar"
    | "engine"
    | "plan"
    | "json"
    | "msgpack"
  downloadedAt: number
  type: "text" | "image" | "audio" | "multimodal"
  path?: string // Added for potential future use with file system access
}

export interface JarvisSettings {
  apiKeys: string[]
  currentKeyIndex: number
  userApiKey?: string
  useUserApiKey: boolean
  voiceActivationEnabled: boolean
  wakeWord: string
  sleepWord: string
  deviceAssistantMode: boolean
  voiceSpeed: number
  voicePitch: number
  autoSaveToFiles: boolean
  theme: "dark" | "darker" | "light"
  useLocalModel: boolean
  selectedLocalModel?: string
  localModels: LocalModel[]
}

export interface AIModel {
  id: string
  name: string
  description: string
  size: number
  url: string
  format:
    | "gguf"
    | "onnx"
    | "safetensors"
    | "bin"
    | "ckpt"
    | "pt"
    | "pth"
    | "tflite"
    | "h5"
    | "pb"
    | "mlmodel"
    | "torchscript"
    | "keras"
    | "mar"
    | "engine"
    | "plan"
    | "json"
    | "msgpack"
  type: "text" | "image" | "audio" | "multimodal"
}

export const AVAILABLE_MODELS: AIModel[] = [
  // ============ SMOLLM FAMILY - TINIEST MODELS ============
  {
    id: "smollm2-135m-q8",
    name: "SmolLM2 135M Q8",
    description: "HuggingFace tiniest LLM, great for mobile",
    size: 144 * 1024 * 1024,
    url: "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "smollm2-135m-fp16",
    name: "SmolLM2 135M FP16",
    description: "HuggingFace tiniest LLM full precision",
    size: 270 * 1024 * 1024,
    url: "https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct-GGUF/resolve/main/smollm2-135m-instruct-fp16.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "smollm2-360m-q8",
    name: "SmolLM2 360M Q8",
    description: "HuggingFace small but capable LLM",
    size: 381 * 1024 * 1024,
    url: "https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct-GGUF/resolve/main/smollm2-360m-instruct-q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "smollm2-1.7b-q4",
    name: "SmolLM2 1.7B Q4",
    description: "HuggingFace best small model Q4 quantized",
    size: 985 * 1024 * 1024,
    url: "https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF/resolve/main/smollm2-1.7b-instruct-q4_k_m.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ QWEN FAMILY ============
  {
    id: "qwen2.5-0.5b-q8",
    name: "Qwen2.5 0.5B Q8",
    description: "Alibaba tiny but smart model",
    size: 531 * 1024 * 1024,
    url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "qwen2.5-0.5b-q4",
    name: "Qwen2.5 0.5B Q4",
    description: "Alibaba tiny model smaller quantization",
    size: 397 * 1024 * 1024,
    url: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "qwen2.5-1.5b-q4",
    name: "Qwen2.5 1.5B Q4",
    description: "Alibaba capable small model",
    size: 986 * 1024 * 1024,
    url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "qwen2.5-coder-0.5b-q8",
    name: "Qwen2.5 Coder 0.5B Q8",
    description: "Alibaba tiny code model",
    size: 531 * 1024 * 1024,
    url: "https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "qwen2.5-coder-1.5b-q4",
    name: "Qwen2.5 Coder 1.5B Q4",
    description: "Alibaba small code model",
    size: 986 * 1024 * 1024,
    url: "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ LLAMA FAMILY ============
  {
    id: "llama-3.2-1b-q8",
    name: "Llama 3.2 1B Q8",
    description: "Meta latest tiny Llama",
    size: 1.3 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "llama-3.2-1b-q4",
    name: "Llama 3.2 1B Q4",
    description: "Meta latest tiny Llama compressed",
    size: 750 * 1024 * 1024,
    url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "tinyllama-1.1b-q8",
    name: "TinyLlama 1.1B Q8",
    description: "Community tiny Llama variant",
    size: 1.1 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "tinyllama-1.1b-q4",
    name: "TinyLlama 1.1B Q4",
    description: "Community tiny Llama compressed",
    size: 669 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ GEMMA FAMILY ============
  {
    id: "gemma-2-2b-q4",
    name: "Gemma 2 2B Q4",
    description: "Google latest small Gemma",
    size: 1.6 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ PHI FAMILY ============
  {
    id: "phi-2-q4",
    name: "Phi-2 Q4",
    description: "Microsoft small but capable model",
    size: 1.6 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "phi-1.5-q8",
    name: "Phi-1.5 Q8",
    description: "Microsoft older but efficient model",
    size: 1.4 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/phi-1_5-GGUF/resolve/main/phi-1_5.Q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ STABLELM FAMILY ============
  {
    id: "stablelm-zephyr-3b-q4",
    name: "StableLM Zephyr 3B Q4",
    description: "Stability AI chat model",
    size: 1.8 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/stablelm-zephyr-3b-GGUF/resolve/main/stablelm-zephyr-3b.Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "stablelm-2-1.6b-q8",
    name: "StableLM 2 1.6B Q8",
    description: "Stability AI efficient model",
    size: 1.7 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/stabilityai/stablelm-2-1_6b-chat/resolve/main/stablelm-2-1_6b-chat.Q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ DEEPSEEK FAMILY ============
  {
    id: "deepseek-coder-1.3b-q8",
    name: "DeepSeek Coder 1.3B Q8",
    description: "DeepSeek small code model",
    size: 1.4 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/deepseek-coder-1.3b-instruct-GGUF/resolve/main/deepseek-coder-1.3b-instruct.Q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "deepseek-coder-1.3b-q4",
    name: "DeepSeek Coder 1.3B Q4",
    description: "DeepSeek small code model compressed",
    size: 800 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/deepseek-coder-1.3b-instruct-GGUF/resolve/main/deepseek-coder-1.3b-instruct.Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ MULTIMODAL (Vision + Text) ============
  {
    id: "moondream2-q4",
    name: "Moondream2 Q4",
    description: "Tiny vision-language model",
    size: 1.8 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/vikhyatk/moondream2/resolve/main/moondream2-text-model-f16.gguf",
    format: "gguf" as const,
    type: "multimodal" as const,
  },

  // ============ ORCA/DOLPHIN FAMILY ============
  {
    id: "orca-mini-3b-q4",
    name: "Orca Mini 3B Q4",
    description: "Microsoft Orca reasoning model",
    size: 1.9 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/TheBloke/orca_mini_3B-GGUF/resolve/main/orca_mini_3b.Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },

  // ============ H2O DANUBE ============
  {
    id: "h2o-danube2-1.8b-q8",
    name: "H2O Danube2 1.8B Q8",
    description: "H2O.ai efficient chat model",
    size: 1.9 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/h2oai/h2o-danube2-1.8b-chat-GGUF/resolve/main/h2o-danube2-1.8b-chat-Q8_0.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
  {
    id: "h2o-danube2-1.8b-q4",
    name: "H2O Danube2 1.8B Q4",
    description: "H2O.ai efficient chat model compressed",
    size: 1.1 * 1024 * 1024 * 1024,
    url: "https://huggingface.co/h2oai/h2o-danube2-1.8b-chat-GGUF/resolve/main/h2o-danube2-1.8b-chat-Q4_K_M.gguf",
    format: "gguf" as const,
    type: "text" as const,
  },
]

const DB_NAME = "jarvis-db"
const DB_VERSION = 2 // Incremented version for new stores

export class JarvisStorage {
  private static instance: JarvisStorage | null = null
  private db: IDBDatabase | null = null

  static getInstance(): JarvisStorage {
    if (!JarvisStorage.instance) {
      JarvisStorage.instance = new JarvisStorage()
    }
    return JarvisStorage.instance
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains("conversations")) {
          const store = db.createObjectStore("conversations", { keyPath: "id" })
          store.createIndex("updatedAt", "updatedAt", { unique: false })
        }

        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" })
        }

        if (!db.objectStoreNames.contains("models")) {
          db.createObjectStore("models", { keyPath: "id" })
        }
      }
    })
  }

  async getSettings(): Promise<JarvisSettings> {
    const defaultSettings: JarvisSettings = {
      apiKeys: [],
      currentKeyIndex: 0,
      useUserApiKey: false,
      voiceActivationEnabled: true,
      wakeWord: "jarvis activate",
      sleepWord: "jarvis go to sleep",
      deviceAssistantMode: false,
      voiceSpeed: 1,
      voicePitch: 1,
      autoSaveToFiles: false,
      theme: "dark",
      useLocalModel: false,
      localModels: [],
    }

    if (!this.db) await this.init()

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["settings"], "readonly")
      const store = transaction.objectStore("settings")
      const request = store.get("main")

      request.onsuccess = () => {
        resolve({ ...defaultSettings, ...(request.result?.settings || {}) })
      }
      request.onerror = () => resolve(defaultSettings)
    })
  }

  async saveSettings(settings: JarvisSettings): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["settings"], "readwrite")
      const store = transaction.objectStore("settings")
      const request = store.put({ id: "main", settings })

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getConversations(): Promise<Conversation[]> {
    if (!this.db) await this.init()

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["conversations"], "readonly")
      const store = transaction.objectStore("conversations")
      const index = store.index("updatedAt")
      const request = index.openCursor(null, "prev")
      const conversations: Conversation[] = []

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          conversations.push(cursor.value)
          cursor.continue()
        } else {
          resolve(conversations)
        }
      }
      request.onerror = () => resolve([])
    })
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["conversations"], "readwrite")
      const store = transaction.objectStore("conversations")
      const request = store.put(conversation)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async deleteConversation(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["conversations"], "readwrite")
      const store = transaction.objectStore("conversations")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async exportToFile(conversations: Conversation[]): Promise<void> {
    const data = JSON.stringify(conversations, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const filename = `jarvis-conversations-${new Date().toISOString().split("T")[0]}.json`

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          startIn: "downloads",
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (e) {
        // Fall through to download
      }
    }

    this.downloadToDevice(blob, filename)
  }

  private downloadToDevice(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async exportSingleConversation(conversation: Conversation): Promise<void> {
    const data = JSON.stringify(conversation, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const safeTitle = conversation.title.replace(/[^a-z0-9]/gi, "_").slice(0, 30)
    const filename = `jarvis-${safeTitle}-${new Date().toISOString().split("T")[0]}.json`

    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          startIn: "downloads",
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch (e) {
        // Fall through to download
      }
    }

    this.downloadToDevice(blob, filename)
  }

  async importFromFile(): Promise<Conversation[] | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return resolve(null)

        const text = await file.text()
        try {
          const conversations = JSON.parse(text)
          resolve(conversations)
        } catch {
          resolve(null)
        }
      }

      input.click()
    })
  }

  async downloadModelToDevice(modelId: string, onProgress?: (progress: number) => void): Promise<LocalModel | null> {
    const modelInfo = AVAILABLE_MODELS.find((m) => m.id === modelId)
    if (!modelInfo) return null

    try {
      // Fetch the model with progress tracking
      const response = await fetch(modelInfo.url)
      if (!response.ok) throw new Error("Download failed")

      const contentLength = Number.parseInt(response.headers.get("content-length") || "0")
      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      const chunks: Uint8Array[] = []
      let receivedLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        receivedLength += value.length

        if (onProgress && contentLength > 0) {
          onProgress((receivedLength / contentLength) * 100)
        }
      }

      // Combine chunks into single array
      const modelData = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        modelData.set(chunk, position)
        position += chunk.length
      }

      const blob = new Blob([modelData], { type: "application/octet-stream" })
      const filename = `${modelInfo.name.replace(/[^a-zA-Z0-9]/g, "_")}.${modelInfo.format}`

      // Try to save to Downloads folder using File System Access API
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            startIn: "downloads",
            types: [
              {
                description: "Model Files",
                accept: {
                  "application/octet-stream": [
                    ".gguf",
                    ".safetensors",
                    ".bin",
                    ".ckpt",
                    ".pt",
                    ".pth",
                    ".onnx",
                    ".tflite",
                    ".h5",
                    ".pb",
                    ".mlmodel",
                    ".torchscript",
                    ".keras",
                    ".mar",
                    ".engine",
                    ".plan",
                    ".json",
                    ".msgpack",
                  ],
                },
              },
            ],
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()

          // Save model info to DB
          const localModel: LocalModel = {
            id: modelId,
            name: modelInfo.name,
            filename: filename,
            size: receivedLength,
            format: modelInfo.format,
            downloadedAt: Date.now(),
            path: filename, // Store filename as path for now
            type: modelInfo.type,
          }

          await this.saveLocalModel(localModel)
          return localModel
        } catch (e) {
          // User cancelled, fall through to regular download
          console.log("File picker cancelled, using fallback download")
        }
      }

      // Fallback: Use download attribute (saves to Downloads by default)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      // Save model info to DB
      const localModel: LocalModel = {
        id: modelId,
        name: modelInfo.name,
        filename: filename,
        size: receivedLength,
        format: modelInfo.format,
        downloadedAt: Date.now(),
        path: filename, // Store filename as path for now
        type: modelInfo.type,
      }

      await this.saveLocalModel(localModel)
      return localModel
    } catch (error) {
      console.error("Model download error:", error)
      return null
    }
  }

  async saveLocalModel(model: LocalModel): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["models"], "readwrite")
      const store = transaction.objectStore("models")
      const request = store.put(model)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getLocalModels(): Promise<LocalModel[]> {
    if (!this.db) await this.init()

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(["models"], "readonly")
      const store = transaction.objectStore("models")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => resolve([])
    })
  }

  async deleteLocalModel(id: string): Promise<void> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["models"], "readwrite")
      const store = transaction.objectStore("models")
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async importModelFromFile(): Promise<LocalModel | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "*"

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return resolve(null)

        const ext = file.name.split(".").pop()?.toLowerCase() || ""
        const validExtensions = [
          "gguf",
          "safetensors",
          "bin",
          "ckpt",
          "pt",
          "pth",
          "onnx",
          "tflite",
          "h5",
          "pb",
          "mlmodel",
          "keras",
          "mar",
          "torchscript",
          "engine",
          "plan",
          "json", // for model configs
          "msgpack", // alternative safetensors format
        ]

        if (!validExtensions.includes(ext)) {
          alert(
            `Unsupported file format: .${ext}\n\nSupported formats:\n- GGUF (.gguf) - llama.cpp\n- SafeTensors (.safetensors) - Hugging Face\n- PyTorch (.bin, .pt, .pth, .ckpt)\n- ONNX (.onnx)\n- TensorFlow (.tflite, .h5, .pb)\n- CoreML (.mlmodel)\n- TensorRT (.engine, .plan)`,
          )
          return resolve(null)
        }

        let modelType: LocalModel["type"] = "text"
        const nameLower = file.name.toLowerCase()
        if (
          nameLower.includes("sd") ||
          nameLower.includes("diffusion") ||
          nameLower.includes("vae") ||
          nameLower.includes("lora") ||
          nameLower.includes("controlnet") ||
          nameLower.includes("unet") ||
          nameLower.includes("clip") ||
          nameLower.includes("image") ||
          nameLower.includes("art") ||
          nameLower.includes("flux") ||
          nameLower.includes("kandinsky") ||
          nameLower.includes("dalle")
        ) {
          modelType = "image"
        } else if (
          nameLower.includes("whisper") ||
          nameLower.includes("audio") ||
          nameLower.includes("tts") ||
          nameLower.includes("voice") ||
          nameLower.includes("speech") ||
          nameLower.includes("bark") ||
          nameLower.includes("musicgen")
        ) {
          modelType = "audio"
        } else if (
          nameLower.includes("multimodal") ||
          nameLower.includes("vision") ||
          nameLower.includes("llava") ||
          nameLower.includes("cogvlm") ||
          nameLower.includes("blip")
        ) {
          modelType = "multimodal"
        }

        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2)
        console.log(`[JARVIS] Importing model: ${file.name} (${sizeInMB} MB, type: ${modelType}, format: ${ext})`)

        const localModel: LocalModel = {
          id: `imported-${Date.now()}`,
          name: file.name.replace(/\.[^.]+$/, ""),
          filename: file.name,
          size: file.size,
          format: ext as LocalModel["format"],
          downloadedAt: Date.now(),
          type: modelType,
          path: file.name, // Store filename as path for now
        }

        await this.saveLocalModel(localModel)
        resolve(localModel)
      }

      input.click()
    })
  }

  triggerNativeBrowserDownload(modelId: string): boolean {
    const modelInfo = AVAILABLE_MODELS.find((m) => m.id === modelId)
    if (!modelInfo) return false

    // Open the URL directly in a new tab - this triggers native browser download
    // The browser will show download progress in its download manager
    // and save the file to the Downloads folder
    window.open(modelInfo.url, "_blank")

    return true
  }

  async saveDownloadedModel(modelId: string): Promise<LocalModel | null> {
    const modelInfo = AVAILABLE_MODELS.find((m) => m.id === modelId)
    if (!modelInfo) return null

    const extension =
      modelInfo.format === "gguf"
        ? ".gguf"
        : modelInfo.format === "safetensors"
          ? ".safetensors"
          : modelInfo.format === "bin"
            ? ".bin"
            : modelInfo.format === "ckpt"
              ? ".ckpt"
              : modelInfo.format === "pt"
                ? ".pt"
                : modelInfo.format === "pth"
                  ? ".pth"
                  : modelInfo.format === "onnx"
                    ? ".onnx"
                    : modelInfo.format === "tflite"
                      ? ".tflite"
                      : modelInfo.format === "h5"
                        ? ".h5"
                        : modelInfo.format === "pb"
                          ? ".pb"
                          : modelInfo.format === "mlmodel"
                            ? ".mlmodel"
                            : modelInfo.format === "torchscript"
                              ? ".torchscript"
                              : ".bin"
    const filename = `${modelInfo.name.replace(/[^a-zA-Z0-9]/g, "_")}${extension}`

    const localModel: LocalModel = {
      id: modelId,
      name: modelInfo.name,
      filename: filename,
      size: modelInfo.size,
      format: modelInfo.format,
      downloadedAt: Date.now(),
      type: modelInfo.type,
      path: filename, // Store filename as path
    }

    await this.saveLocalModel(localModel)
    return localModel
  }
}

export const jarvisStorage = JarvisStorage.getInstance()
