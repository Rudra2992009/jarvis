"use client"

import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface LiveChatButtonProps {
  className?: string
}

export function LiveChatButton({ className }: LiveChatButtonProps) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push("/live")}
      className={cn(
        "relative group flex items-center justify-center w-10 h-10 rounded-full",
        "bg-gradient-to-br from-cyan-500 to-blue-600",
        "hover:from-cyan-400 hover:to-blue-500",
        "border-2 border-cyan-400/80 hover:border-cyan-300",
        "transition-all duration-300 hover:scale-110",
        "shadow-lg shadow-cyan-500/40 hover:shadow-cyan-400/60",
        className,
      )}
      title="Open Live Voice Chat (Beta)"
    >
      <span className="absolute -top-1 -right-1 px-1 py-0.5 text-[8px] font-bold bg-amber-500 text-white rounded shadow-sm z-10">
        β
      </span>

      {/* Pulse ring animation */}
      <span className="absolute inset-0 rounded-full border-2 border-cyan-300 animate-ping opacity-40" />

      {/* Second pulse ring with delay */}
      <span
        className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-30"
        style={{ animationDelay: "0.5s" }}
      />

      {/* Inner concentric circles - ((.)) design */}
      <span className="relative flex items-center justify-center">
        {/* Outer parenthesis - left */}
        <span className="absolute -left-1.5 text-white font-bold text-sm drop-shadow-lg">(</span>

        {/* Middle ring */}
        <span className="absolute w-4 h-4 rounded-full border-2 border-white/80 group-hover:border-white transition-colors" />

        {/* Inner dot - pulsing */}
        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-lg shadow-white/80 animate-pulse" />

        {/* Outer parenthesis - right */}
        <span className="absolute -right-1.5 text-white font-bold text-sm drop-shadow-lg">)</span>
      </span>

      {/* Glow effect on hover */}
      <span
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%)",
        }}
      />
    </button>
  )
}
