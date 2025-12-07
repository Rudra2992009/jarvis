import { type NextRequest, NextResponse } from "next/server"

const PREDEFINED_GEMINI_KEYS = [
  "AIzaSyDWrNn2PFNEntv3FRM0Lbdmwd-tcT0ODK4",
  "AIzaSyDyOdZgsvEp1vZIXn1AR7PeRpor8LOOLg8",
  "AIzaSyCuSNk53R8-35D_s72xygqG5ZWqeFgEUpc",
  "AIzaSyBvTKlnZ3E3PclGhusOrLqNT7SFhPmaZVM",
  "AIzaSyA7ji2fRUzuFo_GXN8UpQJgl8iBmtwSaWw",
  "AIzaSyDFZXsUWmWmW1E0ncM2nxeHU-16i822gaY",
  "AIzaSyBLIciIHiuZ-ooZgzZvPPK0Gk1sOsL5vZ0",
  "AIzaSyA_bVMYW4SaTlBJ3KodbYR_6PtOVzYv-F4",
  "AIzaSyAx8vPkLsefSLqJFTmPvySENkNxV_Ig2yU",
  "AIzaSyDX4zDjm8rJSeaN6Nk-btcdzXCxn2Xpi6Y",
  "AIzaSyCkRVYZssP0PXzNBwK6DhE3TrC3Cb-vHTU",
  "AIzaSyC5ZgqC2t2L87yIVbOreRU5ECNUIYrC_-M",
  "AIzaSyAASmQJmFIsTSgkiUqCbExQwN0GqQB1XVE",
  "AIzaSyDa8F3D54tR3fdGU2rZuT4q-j5ESDjB1Wg",
  "AIzaSyChWDBxmlx-xy0BnsV0AkS4hySyX52KjTQ",
  "AIzaSyBhtbjajmSir8gdL5kF2koyK_89U9v8wOc",
  "AIzaSyBz4NPbsOHVIpOs5WMsgFWvkq1E06hXUaE",
  "AIzaSyAHJPsAA6uEB1mt7DbCPOHvjrUhzS5DDCM",
  "AIzaSyABqQGGODFDpN9rRrU6s62KJvzA-OlkYFE",
  "AIzaSyAXs2HjQnmbOlbsZR3m8FPJ83AuDPKliy8",
  "AIzaSyAwaTJ3nlGwMoGYv_m9fA6zHoai1X2P_sw",
]

const USER_GEMINI_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY

function getAllApiKeys(): string[] {
  const keys = [...PREDEFINED_GEMINI_KEYS]
  if (USER_GEMINI_KEY && !keys.includes(USER_GEMINI_KEY)) {
    keys.push(USER_GEMINI_KEY)
  }
  return keys
}

let currentKeyIndex = 0
function getNextApiKey(): string {
  const keys = getAllApiKeys()
  const key = keys[currentKeyIndex % keys.length]
  currentKeyIndex = (currentKeyIndex + 1) % keys.length
  return key
}

async function generateWithGemini(prompt: string): Promise<{ url: string; source: string }[]> {
  const images: { url: string; source: string }[] = []
  const keys = getAllApiKeys()

  const models = [
    "gemini-2.0-flash-exp-image-generation",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-1.5-flash",
  ]

  for (let keyAttempt = 0; keyAttempt < Math.min(5, keys.length); keyAttempt++) {
    const apiKey = getNextApiKey()

    for (const model of models) {
      try {
        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: `Generate a high-quality, detailed image: ${prompt}. Make it visually appealing and professional.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain",
          },
        }

        if (model.includes("image-generation")) {
          ;(requestBody.generationConfig as any).responseModalities = ["IMAGE", "TEXT"]
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          },
        )

        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Gemini response for model", model, ":", JSON.stringify(data).substring(0, 500))

          if (data.candidates && data.candidates[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                const mimeType = part.inlineData.mimeType || "image/png"
                images.push({
                  url: `data:${mimeType};base64,${part.inlineData.data}`,
                  source: `Gemini AI`,
                })
              }
            }
          }
          if (images.length > 0) return images
        } else {
          const errorText = await response.text()
          console.log("[v0] Gemini error:", response.status, errorText.substring(0, 200))
          if (response.status === 429) {
            break // Rate limited, try next key
          }
        }
      } catch (e) {
        console.log("[v0] Gemini fetch error:", e)
      }
    }

    if (images.length > 0) break
  }

  return images
}

async function searchLexica(query: string): Promise<{ url: string; source: string }[]> {
  const images: { url: string; source: string }[] = []
  try {
    const response = await fetch(`https://lexica.art/api/v1/search?q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json" },
    })
    if (response.ok) {
      const data = await response.json()
      if (data.images && data.images.length > 0) {
        for (const img of data.images.slice(0, 6)) {
          images.push({
            url: img.src || img.srcSmall,
            source: "Lexica AI",
          })
        }
      }
    }
  } catch (e) {
    console.log("[v0] Lexica search failed:", e)
  }
  return images
}

async function generateWithHuggingFace(prompt: string): Promise<{ url: string; source: string }[]> {
  const images: { url: string; source: string }[] = []
  const models = ["stabilityai/stable-diffusion-2-1", "runwayml/stable-diffusion-v1-5"]

  for (const model of models) {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt }),
      })

      if (response.ok && response.headers.get("content-type")?.includes("image")) {
        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const base64 = Buffer.from(arrayBuffer).toString("base64")
        images.push({
          url: `data:image/jpeg;base64,${base64}`,
          source: "HuggingFace AI",
        })
        break
      }
    } catch (e) {
      console.log("[v0] HuggingFace failed:", e)
    }
  }

  return images
}

function getStockImages(query: string, count: number): { url: string; source: string; isAIGenerated: boolean }[] {
  const images: { url: string; source: string; isAIGenerated: boolean }[] = []
  const keywords = query.split(" ").slice(0, 3).join(",")
  const timestamp = Date.now()

  for (let i = 0; i < Math.min(count, 2); i++) {
    images.push({
      url: `https://source.unsplash.com/512x512/?${encodeURIComponent(keywords)}&sig=${timestamp + i}`,
      source: "Unsplash",
      isAIGenerated: false,
    })
  }

  for (let i = 0; i < Math.min(count, 2); i++) {
    images.push({
      url: `https://loremflickr.com/512/512/${encodeURIComponent(keywords)}?random=${timestamp + i + 100}`,
      source: "LoremFlickr",
      isAIGenerated: false,
    })
  }

  for (let i = 0; i < Math.min(count, 2); i++) {
    images.push({
      url: `https://picsum.photos/seed/${encodeURIComponent(query.replace(/\s+/g, "-"))}-${i}/512/512`,
      source: "Picsum",
      isAIGenerated: false,
    })
  }

  return images.slice(0, count)
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, count = 4 } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    console.log("[v0] Starting image generation for:", prompt)

    const images: { url: string; source: string; isAIGenerated: boolean }[] = []

    const [geminiResults, lexicaResults, hfResults] = await Promise.all([
      generateWithGemini(prompt),
      searchLexica(prompt),
      generateWithHuggingFace(prompt),
    ])

    console.log(
      "[v0] Results - Gemini:",
      geminiResults.length,
      "Lexica:",
      lexicaResults.length,
      "HF:",
      hfResults.length,
    )

    for (const img of geminiResults) {
      images.push({ ...img, isAIGenerated: true })
    }

    for (const img of hfResults) {
      images.push({ ...img, isAIGenerated: true })
    }

    for (const img of lexicaResults.slice(0, 4)) {
      images.push({ ...img, isAIGenerated: true })
    }

    if (images.length < count) {
      const stockImages = getStockImages(prompt, count - images.length)
      images.push(...stockImages)
    }

    if (images.length === 0) {
      const fallbackImages = getStockImages(prompt, count)
      images.push(...fallbackImages)
    }

    const aiImages = images.filter((i) => i.isAIGenerated)
    const stockImages = images.filter((i) => !i.isAIGenerated)
    const sortedImages = [...aiImages, ...stockImages]

    console.log("[v0] Final images:", sortedImages.length, "AI:", aiImages.length)

    return NextResponse.json({
      success: true,
      prompt,
      images: sortedImages.slice(0, count),
      totalFound: images.length,
      aiGenerated: aiImages.length,
      keysAvailable: getAllApiKeys().length,
    })
  } catch (error) {
    console.error("[v0] Image generation error:", error)

    const fallbackImages = getStockImages("nature landscape", 4)

    return NextResponse.json({
      success: true,
      prompt: "fallback",
      images: fallbackImages,
      message: "Using fallback images",
    })
  }
}
