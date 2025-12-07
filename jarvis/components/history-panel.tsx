"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Trash2, MessageSquare, Download, FileDown, Upload } from "lucide-react"
import { type Conversation, jarvisStorage } from "@/lib/jarvis-storage"
import { formatDistanceToNow } from "date-fns"

interface HistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  onSelectConversation: (conversation: Conversation) => void
}

export function HistoryPanel({ isOpen, onClose, onSelectConversation }: HistoryPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen])

  const loadConversations = async () => {
    setIsLoading(true)
    const convs = await jarvisStorage.getConversations()
    setConversations(convs)
    setIsLoading(false)
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await jarvisStorage.deleteConversation(id)
    setConversations(conversations.filter((c) => c.id !== id))
  }

  const exportSingle = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation()
    await jarvisStorage.exportSingleConversation(conv)
  }

  const handleImport = async () => {
    const imported = await jarvisStorage.importFromFile()
    if (imported) {
      for (const conv of Array.isArray(imported) ? imported : [imported]) {
        await jarvisStorage.saveConversation(conv)
      }
      await loadConversations()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-hidden bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6">
          <CardTitle className="text-foreground text-base sm:text-xl">History</CardTitle>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImport}
              title="Import"
              className="h-8 px-2 sm:px-3 bg-transparent"
            >
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs sm:text-sm">Import</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await jarvisStorage.exportToFile(conversations)
              }}
              title="Export all"
              className="h-8 px-2 sm:px-3"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs sm:text-sm">Export</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-0">
          <ScrollArea className="h-[65vh] sm:h-[60vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-2">Conversations are saved automatically</p>
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted hover:bg-muted/80 cursor-pointer transition-colors group"
                    onClick={() => {
                      onSelectConversation(conv)
                      onClose()
                    }}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-xs sm:text-sm truncate">{conv.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {conv.messages.length} msgs • {formatDistanceToNow(conv.updatedAt, { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => exportSingle(conv, e)}
                      className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 sm:h-8 sm:w-8"
                      title="Export"
                    >
                      <FileDown className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 sm:h-8 sm:w-8"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
