"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface JarvisOrbProps {
  state: "idle" | "listening" | "speaking" | "processing"
  size?: "sm" | "md" | "lg" | "xl"
  onClick?: () => void
  showParticles?: boolean
}

export function JarvisOrb({ state, size = "lg", onClick, showParticles = true }: JarvisOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const [audioLevel, setAudioLevel] = useState(0)

  const sizeConfig = {
    sm: { container: "w-10 h-10", canvas: 40 },
    md: { container: "w-20 h-20", canvas: 80 },
    lg: { container: "w-32 h-32", canvas: 128 },
    xl: { container: "w-48 h-48", canvas: 192 },
  }

  // Audio visualization effect
  useEffect(() => {
    if (state === "speaking" || state === "listening") {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.5 + 0.5)
      }, 100)
      return () => clearInterval(interval)
    } else {
      setAudioLevel(0)
    }
  }, [state])

  // Canvas animation for particles and rings
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const baseRadius = canvas.width * 0.3

    let particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      life: number
      maxLife: number
      size: number
    }> = []

    let ringRotation = 0

    const createParticle = () => {
      const angle = Math.random() * Math.PI * 2
      const distance = baseRadius * 0.8
      return {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0,
        maxLife: 60 + Math.random() * 60,
        size: 1 + Math.random() * 2,
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Outer rotating ring
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(ringRotation)

      const ringSpeed = state === "speaking" ? 0.03 : state === "listening" ? 0.015 : 0.005
      ringRotation += ringSpeed

      // Draw dashed ring
      ctx.beginPath()
      ctx.setLineDash([8, 8])
      ctx.strokeStyle =
        state === "idle"
          ? "rgba(34, 211, 238, 0.3)"
          : state === "speaking"
            ? "rgba(34, 211, 238, 0.8)"
            : "rgba(34, 211, 238, 0.5)"
      ctx.lineWidth = 2
      ctx.arc(0, 0, baseRadius * 1.3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Inner ring
      ctx.beginPath()
      ctx.strokeStyle = state === "idle" ? "rgba(34, 211, 238, 0.4)" : "rgba(34, 211, 238, 0.7)"
      ctx.lineWidth = 1
      ctx.setLineDash([])
      ctx.arc(centerX, centerY, baseRadius * 1.1, 0, Math.PI * 2)
      ctx.stroke()

      // Core glow based on state
      const glowIntensity =
        state === "speaking"
          ? 0.9 + audioLevel * 0.2
          : state === "listening"
            ? 0.7 + audioLevel * 0.15
            : state === "processing"
              ? 0.6
              : 0.4

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius)
      gradient.addColorStop(0, `rgba(34, 211, 238, ${glowIntensity})`)
      gradient.addColorStop(0.5, `rgba(14, 165, 233, ${glowIntensity * 0.7})`)
      gradient.addColorStop(1, "rgba(14, 165, 233, 0)")

      ctx.beginPath()
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      // Outer glow
      const outerGlow = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, baseRadius * 1.5)
      outerGlow.addColorStop(0, `rgba(34, 211, 238, ${glowIntensity * 0.3})`)
      outerGlow.addColorStop(1, "rgba(34, 211, 238, 0)")

      ctx.beginPath()
      ctx.arc(centerX, centerY, baseRadius * 1.5, 0, Math.PI * 2)
      ctx.fillStyle = outerGlow
      ctx.fill()

      // Particles
      if (showParticles && state !== "idle") {
        // Add new particles
        if (Math.random() > 0.7) {
          particles.push(createParticle())
        }

        // Update and draw particles
        particles = particles.filter((p) => {
          p.life++
          p.x += p.vx
          p.y += p.vy

          const progress = p.life / p.maxLife
          const alpha = 1 - progress

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.8})`
          ctx.fill()

          return p.life < p.maxLife
        })
      }

      // Audio wave visualization for speaking/listening
      if (state === "speaking" || state === "listening") {
        const waveCount = 5
        const waveWidth = 3
        const waveSpacing = 6
        const maxWaveHeight = baseRadius * 0.4

        ctx.save()
        ctx.translate(centerX - ((waveCount - 1) * waveSpacing) / 2, centerY)

        for (let i = 0; i < waveCount; i++) {
          const phase = (Date.now() / (state === "speaking" ? 100 : 200) + i * 0.5) % (Math.PI * 2)
          const height = Math.sin(phase) * maxWaveHeight * audioLevel

          ctx.beginPath()
          ctx.roundRect(i * waveSpacing - waveWidth / 2, -height / 2, waveWidth, Math.max(height, 4), 2)
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
          ctx.fill()
        }
        ctx.restore()
      }

      // Processing spinner
      if (state === "processing") {
        ctx.save()
        ctx.translate(centerX, centerY)
        ctx.rotate((Date.now() / 200) % (Math.PI * 2))

        ctx.beginPath()
        ctx.arc(0, 0, baseRadius * 0.4, 0, Math.PI * 1.5)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)"
        ctx.lineWidth = 3
        ctx.lineCap = "round"
        ctx.stroke()
        ctx.restore()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [state, audioLevel, showParticles])

  return (
    <div className={cn("relative cursor-pointer flex-shrink-0", sizeConfig[size].container)} onClick={onClick}>
      <canvas
        ref={canvasRef}
        width={sizeConfig[size].canvas * 2}
        height={sizeConfig[size].canvas * 2}
        className="w-full h-full"
        style={{ imageRendering: "auto" }}
      />
    </div>
  )
}
