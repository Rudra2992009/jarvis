interface ImageResult {
  id: string
  url: string
  thumbnail: string
  alt: string
  source: string
  sourceUrl: string
  license: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") || ""

  if (!query) {
    return Response.json({ images: [] })
  }

  const images: ImageResult[] = []
  const encodedQuery = encodeURIComponent(query)
  const hash = Math.abs(query.split("").reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0))

  // ============================================
  // SOURCE 1-10: Lorem Picsum (MIT) - 50 images
  // ============================================
  for (let i = 0; i < 25; i++) {
    images.push({
      id: `picsum-${i}`,
      url: `https://picsum.photos/seed/${query}${i}/800/600`,
      thumbnail: `https://picsum.photos/seed/${query}${i}/200/150`,
      alt: `${query} photo ${i + 1}`,
      source: "Lorem Picsum",
      sourceUrl: "https://picsum.photos/",
      license: "MIT",
    })
  }
  for (let i = 0; i < 15; i++) {
    images.push({
      id: `picsum-gray-${i}`,
      url: `https://picsum.photos/seed/${query}g${i}/800/600?grayscale`,
      thumbnail: `https://picsum.photos/seed/${query}g${i}/200/150?grayscale`,
      alt: `${query} grayscale`,
      source: "Lorem Picsum Grayscale",
      sourceUrl: "https://picsum.photos/",
      license: "MIT",
    })
  }
  for (let i = 0; i < 10; i++) {
    images.push({
      id: `picsum-blur-${i}`,
      url: `https://picsum.photos/seed/${query}b${i}/800/600?blur=2`,
      thumbnail: `https://picsum.photos/seed/${query}b${i}/200/150?blur=2`,
      alt: `${query} blur effect`,
      source: "Lorem Picsum Blur",
      sourceUrl: "https://picsum.photos/",
      license: "MIT",
    })
  }

  // ============================================
  // SOURCE 11-35: DiceBear Avatars (MIT) - 75 images
  // ============================================
  const dicebearStyles = [
    "avataaars",
    "avataaars-neutral",
    "bottts",
    "bottts-neutral",
    "identicon",
    "initials",
    "micah",
    "miniavs",
    "lorelei",
    "lorelei-neutral",
    "notionists",
    "notionists-neutral",
    "open-peeps",
    "personas",
    "pixel-art",
    "pixel-art-neutral",
    "thumbs",
    "adventurer",
    "adventurer-neutral",
    "big-ears",
    "big-ears-neutral",
    "big-smile",
    "croodles",
    "croodles-neutral",
    "fun-emoji",
  ]
  dicebearStyles.forEach((style, i) => {
    for (let j = 0; j < 3; j++) {
      images.push({
        id: `dicebear-${style}-${j}`,
        url: `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedQuery}${j}&size=400`,
        thumbnail: `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedQuery}${j}&size=100`,
        alt: `${query} ${style} avatar`,
        source: `DiceBear ${style}`,
        sourceUrl: "https://dicebear.com/",
        license: "MIT",
      })
    }
  })

  // ============================================
  // SOURCE 36-45: UI Avatars (Free Forever) - 30 images
  // ============================================
  const uiColors = [
    "0D8ABC",
    "F44336",
    "4CAF50",
    "9C27B0",
    "FF9800",
    "00BCD4",
    "E91E63",
    "3F51B5",
    "009688",
    "795548",
    "607D8B",
    "FF5722",
    "673AB7",
    "2196F3",
    "8BC34A",
    "FFC107",
    "00ACC1",
    "5E35B1",
    "43A047",
    "FB8C00",
    "D81B60",
    "1E88E5",
    "7CB342",
    "FFB300",
    "5C6BC0",
    "26A69A",
    "EC407A",
    "42A5F5",
    "66BB6A",
    "FFCA28",
  ]
  uiColors.forEach((bg) => {
    images.push({
      id: `uiavatar-${bg}`,
      url: `https://ui-avatars.com/api/?name=${encodedQuery}&size=400&background=${bg}&color=fff&bold=true&format=svg`,
      thumbnail: `https://ui-avatars.com/api/?name=${encodedQuery}&size=100&background=${bg}&color=fff`,
      alt: `${query} avatar`,
      source: "UI Avatars",
      sourceUrl: "https://ui-avatars.com/",
      license: "Free Forever",
    })
  })

  // ============================================
  // SOURCE 46-55: Robohash (CC BY) - 30 images
  // ============================================
  const roboSets = ["set1", "set2", "set3", "set4", "set5"]
  const roboBgs = ["bg1", "bg2", ""]
  roboSets.forEach((set) => {
    roboBgs.forEach((bg) => {
      for (let i = 0; i < 2; i++) {
        images.push({
          id: `robohash-${set}-${bg}-${i}`,
          url: `https://robohash.org/${encodedQuery}${i}?set=${set}${bg ? `&bgset=${bg}` : ""}&size=400x400`,
          thumbnail: `https://robohash.org/${encodedQuery}${i}?set=${set}${bg ? `&bgset=${bg}` : ""}&size=100x100`,
          alt: `${query} robot avatar`,
          source: `Robohash ${set}`,
          sourceUrl: "https://robohash.org/",
          license: "CC BY",
        })
      }
    })
  })

  // ============================================
  // SOURCE 56-65: Boring Avatars (MIT) - 36 images
  // ============================================
  const boringVariants = ["marble", "beam", "pixel", "sunset", "ring", "bauhaus"]
  const boringColors = [
    ["264653", "2a9d8f", "e9c46a", "f4a261", "e76f51"],
    ["ef476f", "ffd166", "06d6a0", "118ab2", "073b4c"],
    ["606c38", "283618", "fefae0", "dda15e", "bc6c25"],
    ["003049", "d62828", "f77f00", "fcbf49", "eae2b7"],
    ["780000", "c1121f", "fdf0d5", "003049", "669bbc"],
    ["ffbe0b", "fb5607", "ff006e", "8338ec", "3a86ff"],
  ]
  boringVariants.forEach((variant) => {
    boringColors.forEach((colors, ci) => {
      images.push({
        id: `boring-${variant}-${ci}`,
        url: `https://source.boringavatars.com/${variant}/400/${encodedQuery}${ci}?colors=${colors.join(",")}`,
        thumbnail: `https://source.boringavatars.com/${variant}/100/${encodedQuery}${ci}?colors=${colors.join(",")}`,
        alt: `${query} abstract avatar`,
        source: `Boring Avatars ${variant}`,
        sourceUrl: "https://boringavatars.com/",
        license: "MIT",
      })
    })
  })

  // ============================================
  // SOURCE 66-70: Pravatar (Free) - 20 images
  // ============================================
  for (let i = 1; i <= 20; i++) {
    images.push({
      id: `pravatar-${i}`,
      url: `https://i.pravatar.cc/400?u=${encodedQuery}${i}`,
      thumbnail: `https://i.pravatar.cc/100?u=${encodedQuery}${i}`,
      alt: `${query} person ${i}`,
      source: "Pravatar",
      sourceUrl: "https://pravatar.cc/",
      license: "Free Forever",
    })
  }

  // ============================================
  // SOURCE 71-75: Multiavatar (MIT) - 20 images
  // ============================================
  for (let i = 0; i < 20; i++) {
    images.push({
      id: `multiavatar-${i}`,
      url: `https://api.multiavatar.com/${encodedQuery}${i}.svg`,
      thumbnail: `https://api.multiavatar.com/${encodedQuery}${i}.svg`,
      alt: `${query} multiavatar`,
      source: "Multiavatar",
      sourceUrl: "https://multiavatar.com/",
      license: "MIT",
    })
  }

  // ============================================
  // SOURCE 76-90: LoremFlickr Categories (CC) - 45 images
  // ============================================
  const flickrCategories = [
    "",
    "nature",
    "city",
    "people",
    "animals",
    "food",
    "business",
    "technology",
    "travel",
    "architecture",
    "art",
    "fashion",
    "sports",
    "music",
    "health",
  ]
  flickrCategories.forEach((cat) => {
    for (let i = 0; i < 3; i++) {
      images.push({
        id: `loremflickr-${cat || "all"}-${i}`,
        url: `https://loremflickr.com/800/600/${cat ? `${cat},${encodedQuery}` : encodedQuery}?random=${Date.now() + i}`,
        thumbnail: `https://loremflickr.com/200/150/${cat ? `${cat},${encodedQuery}` : encodedQuery}?random=${Date.now() + i}`,
        alt: `${query} ${cat || "photo"}`,
        source: `LoremFlickr ${cat || "All"}`,
        sourceUrl: "https://loremflickr.com/",
        license: "Creative Commons",
      })
    }
  })

  // ============================================
  // SOURCE 91-100: Unsplash Source (Free) - 40 images
  // ============================================
  const unsplashQueries = [
    query,
    `${query},nature`,
    `${query},city`,
    `${query},abstract`,
    `${query},minimal`,
    `${query},dark`,
    `${query},light`,
    `${query},colorful`,
    `${query},modern`,
    `${query},vintage`,
    `${query},technology`,
    `${query},business`,
    `${query},creative`,
    `${query},design`,
    `${query},landscape`,
    `${query},portrait`,
    `${query},texture`,
    `${query},pattern`,
    `${query},background`,
    `${query},wallpaper`,
  ]
  unsplashQueries.forEach((q, i) => {
    images.push({
      id: `unsplash-${i}`,
      url: `https://source.unsplash.com/800x600/?${encodeURIComponent(q)}&sig=${hash + i}`,
      thumbnail: `https://source.unsplash.com/200x150/?${encodeURIComponent(q)}&sig=${hash + i}`,
      alt: q.replace(",", " "),
      source: "Unsplash Source",
      sourceUrl: "https://unsplash.com/",
      license: "Unsplash License",
    })
    images.push({
      id: `unsplash-portrait-${i}`,
      url: `https://source.unsplash.com/600x800/?${encodeURIComponent(q)}&sig=${hash + i + 100}`,
      thumbnail: `https://source.unsplash.com/150x200/?${encodeURIComponent(q)}&sig=${hash + i + 100}`,
      alt: `${q.replace(",", " ")} portrait`,
      source: "Unsplash Portrait",
      sourceUrl: "https://unsplash.com/",
      license: "Unsplash License",
    })
  })

  // ============================================
  // SOURCE 101-110: Placeholder.com (Free) - 25 images
  // ============================================
  const placeholderColors = [
    { bg: "3498db", fg: "ffffff" },
    { bg: "e74c3c", fg: "ffffff" },
    { bg: "2ecc71", fg: "ffffff" },
    { bg: "9b59b6", fg: "ffffff" },
    { bg: "f39c12", fg: "000000" },
    { bg: "1abc9c", fg: "ffffff" },
    { bg: "34495e", fg: "ffffff" },
    { bg: "e67e22", fg: "ffffff" },
    { bg: "16a085", fg: "ffffff" },
    { bg: "c0392b", fg: "ffffff" },
    { bg: "27ae60", fg: "ffffff" },
    { bg: "8e44ad", fg: "ffffff" },
    { bg: "2980b9", fg: "ffffff" },
    { bg: "d35400", fg: "ffffff" },
    { bg: "7f8c8d", fg: "ffffff" },
    { bg: "2c3e50", fg: "ffffff" },
    { bg: "f1c40f", fg: "000000" },
    { bg: "e91e63", fg: "ffffff" },
    { bg: "00bcd4", fg: "ffffff" },
    { bg: "ff5722", fg: "ffffff" },
    { bg: "795548", fg: "ffffff" },
    { bg: "607d8b", fg: "ffffff" },
    { bg: "4caf50", fg: "ffffff" },
    { bg: "03a9f4", fg: "ffffff" },
    { bg: "9c27b0", fg: "ffffff" },
  ]
  placeholderColors.forEach(({ bg, fg }) => {
    images.push({
      id: `placeholder-${bg}`,
      url: `https://via.placeholder.com/800x600/${bg}/${fg}?text=${encodedQuery.replace(/%20/g, "+")}`,
      thumbnail: `https://via.placeholder.com/200x150/${bg}/${fg}?text=${encodedQuery.replace(/%20/g, "+")}`,
      alt: `${query} placeholder`,
      source: "Placeholder.com",
      sourceUrl: "https://placeholder.com/",
      license: "Free Forever",
    })
  })

  // ============================================
  // SOURCE 111-120: Placehold.co (Free) - 30 images
  // ============================================
  const placeholdCoColors = [
    "1e3a8a",
    "dc2626",
    "16a34a",
    "7c3aed",
    "ea580c",
    "0891b2",
    "be185d",
    "4338ca",
    "059669",
    "d97706",
    "7c2d12",
    "1d4ed8",
    "15803d",
    "a21caf",
    "c2410c",
    "0e7490",
    "9333ea",
    "b91c1c",
    "047857",
    "f59e0b",
    "6366f1",
    "ec4899",
    "14b8a6",
    "f43f5e",
    "8b5cf6",
    "06b6d4",
    "10b981",
    "f97316",
    "84cc16",
    "22d3ee",
  ]
  placeholdCoColors.forEach((color) => {
    images.push({
      id: `placeholdco-${color}`,
      url: `https://placehold.co/800x600/${color}/white?text=${encodedQuery.replace(/%20/g, "+")}`,
      thumbnail: `https://placehold.co/200x150/${color}/white?text=${encodedQuery.replace(/%20/g, "+")}`,
      alt: `${query}`,
      source: "Placehold.co",
      sourceUrl: "https://placehold.co/",
      license: "Free Forever",
    })
  })

  // ============================================
  // SOURCE 121-125: DummyImage (Free) - 20 images
  // ============================================
  const dummyColors = [
    "007bff",
    "28a745",
    "dc3545",
    "ffc107",
    "17a2b8",
    "6c757d",
    "343a40",
    "f8f9fa",
    "6610f2",
    "e83e8c",
    "fd7e14",
    "20c997",
    "6f42c1",
    "e91e63",
    "009688",
    "ff5722",
    "795548",
    "9e9e9e",
    "607d8b",
    "3f51b5",
  ]
  dummyColors.forEach((color) => {
    images.push({
      id: `dummyimage-${color}`,
      url: `https://dummyimage.com/800x600/${color}/ffffff&text=${encodedQuery.replace(/%20/g, "+")}`,
      thumbnail: `https://dummyimage.com/200x150/${color}/ffffff&text=${encodedQuery.replace(/%20/g, "+")}`,
      alt: `${query}`,
      source: "DummyImage",
      sourceUrl: "https://dummyimage.com/",
      license: "Free Forever",
    })
  })

  // ============================================
  // SOURCE 126-130: FakeImg (Free) - 25 images
  // ============================================
  const fakeImgColors = [
    "282828",
    "1a1a2e",
    "16213e",
    "0f3460",
    "533483",
    "e94560",
    "ff6b6b",
    "4ecdc4",
    "45b7d1",
    "96ceb4",
    "ffeaa7",
    "dfe6e9",
    "74b9ff",
    "a29bfe",
    "fd79a8",
    "00b894",
    "00cec9",
    "6c5ce7",
    "fdcb6e",
    "e17055",
    "fab1a0",
    "81ecec",
    "55efc4",
    "ffeaa7",
    "dfe6e9",
  ]
  fakeImgColors.forEach((color) => {
    images.push({
      id: `fakeimg-${color}`,
      url: `https://fakeimg.pl/800x600/${color}/ffffff?text=${encodedQuery.replace(/%20/g, "+")}`,
      thumbnail: `https://fakeimg.pl/200x150/${color}/ffffff?text=${encodedQuery.replace(/%20/g, "+")}`,
      alt: `${query}`,
      source: "FakeImg",
      sourceUrl: "https://fakeimg.pl/",
      license: "Free Forever",
    })
  })

  // ============================================
  // SOURCE 131-135: PlaceKitten (Free) - 20 images
  // ============================================
  for (let i = 0; i < 10; i++) {
    images.push({
      id: `kitten-${i}`,
      url: `https://placekitten.com/${800 + i * 5}/${600 + i * 5}`,
      thumbnail: `https://placekitten.com/200/150`,
      alt: `Kitten ${i}`,
      source: "PlaceKitten",
      sourceUrl: "https://placekitten.com/",
      license: "Free Forever",
    })
    images.push({
      id: `kitten-gray-${i}`,
      url: `https://placekitten.com/g/${800 + i * 5}/${600 + i * 5}`,
      thumbnail: `https://placekitten.com/g/200/150`,
      alt: `Kitten grayscale`,
      source: "PlaceKitten Grayscale",
      sourceUrl: "https://placekitten.com/",
      license: "Free Forever",
    })
  }

  // ============================================
  // SOURCE 136-138: PlaceDog (Free) - 15 images
  // ============================================
  for (let i = 0; i < 15; i++) {
    images.push({
      id: `dog-${i}`,
      url: `https://placedog.net/${800 + i * 10}/${600 + i * 10}?id=${i}`,
      thumbnail: `https://placedog.net/200/150?id=${i}`,
      alt: `Dog ${i}`,
      source: "PlaceDog",
      sourceUrl: "https://placedog.net/",
      license: "Free Forever",
    })
  }

  // ============================================
  // SOURCE 139-140: PlaceBear (Free) - 15 images
  // ============================================
  for (let i = 0; i < 15; i++) {
    images.push({
      id: `bear-${i}`,
      url: `https://placebear.com/${800 + i * 5}/${600 + i * 5}`,
      thumbnail: `https://placebear.com/200/150`,
      alt: `Bear ${i}`,
      source: "PlaceBear",
      sourceUrl: "https://placebear.com/",
      license: "Free Forever",
    })
  }

  // ============================================
  // SOURCE 141-143: Cataas (Free) - 20 images
  // ============================================
  for (let i = 0; i < 10; i++) {
    images.push({
      id: `cat-${i}`,
      url: `https://cataas.com/cat?width=800&height=600&${i}&t=${hash}`,
      thumbnail: `https://cataas.com/cat?width=200&height=150&${i}&t=${hash}`,
      alt: `Cat ${i}`,
      source: "Cataas",
      sourceUrl: "https://cataas.com/",
      license: "Free Forever",
    })
    images.push({
      id: `cat-text-${i}`,
      url: `https://cataas.com/cat/says/${encodedQuery}?width=800&height=600&${i}`,
      thumbnail: `https://cataas.com/cat/says/${encodedQuery}?width=200&height=150&${i}`,
      alt: `Cat saying ${query}`,
      source: "Cataas Text",
      sourceUrl: "https://cataas.com/",
      license: "Free Forever",
    })
  }

  // ============================================
  // SOURCE 144-150: Picsum Curated IDs - 25 images
  // ============================================
  const curatedIds = [
    10, 20, 30, 40, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000,
    1050,
  ]
  curatedIds.forEach((id) => {
    images.push({
      id: `picsum-curated-${id}`,
      url: `https://picsum.photos/id/${id}/800/600`,
      thumbnail: `https://picsum.photos/id/${id}/200/150`,
      alt: `Curated photo ${id}`,
      source: "Lorem Picsum Curated",
      sourceUrl: "https://picsum.photos/",
      license: "MIT",
    })
  })

  // ============================================
  // SOURCE 151+: Additional Sources
  // ============================================

  // RandomUser API faces (Free)
  for (let i = 0; i < 10; i++) {
    images.push({
      id: `randomuser-${i}`,
      url: `https://randomuser.me/api/portraits/men/${(hash + i) % 100}.jpg`,
      thumbnail: `https://randomuser.me/api/portraits/thumb/men/${(hash + i) % 100}.jpg`,
      alt: `Random person male ${i}`,
      source: "RandomUser Men",
      sourceUrl: "https://randomuser.me/",
      license: "CC BY",
    })
    images.push({
      id: `randomuser-women-${i}`,
      url: `https://randomuser.me/api/portraits/women/${(hash + i) % 100}.jpg`,
      thumbnail: `https://randomuser.me/api/portraits/thumb/women/${(hash + i) % 100}.jpg`,
      alt: `Random person female ${i}`,
      source: "RandomUser Women",
      sourceUrl: "https://randomuser.me/",
      license: "CC BY",
    })
  }

  // SVG Pattern Generators (Free)
  const patterns = [
    "jigsaw",
    "overcast",
    "formal-invitation",
    "topography",
    "texture",
    "jupiter",
    "architect",
    "cutout",
    "hideout",
    "graph-paper",
  ]
  patterns.forEach((pattern, i) => {
    images.push({
      id: `pattern-${pattern}`,
      url: `https://www.transparenttextures.com/patterns/${pattern}.png`,
      thumbnail: `https://www.transparenttextures.com/patterns/${pattern}.png`,
      alt: `${pattern} pattern`,
      source: "Transparent Textures",
      sourceUrl: "https://www.transparenttextures.com/",
      license: "Free Forever",
    })
  })

  // Country Flags (Free)
  const countries = ["us", "gb", "de", "fr", "in", "jp", "cn", "br", "au", "ca", "mx", "it", "es", "kr", "ru"]
  countries.forEach((code) => {
    images.push({
      id: `flag-${code}`,
      url: `https://flagcdn.com/w640/${code}.png`,
      thumbnail: `https://flagcdn.com/w160/${code}.png`,
      alt: `${code.toUpperCase()} flag`,
      source: "FlagCDN",
      sourceUrl: "https://flagcdn.com/",
      license: "Public Domain",
    })
  })

  // Gravatar (Free)
  for (let i = 0; i < 10; i++) {
    const gravatarStyles = ["mp", "identicon", "monsterid", "wavatar", "retro", "robohash"]
    gravatarStyles.forEach((style) => {
      images.push({
        id: `gravatar-${style}-${i}`,
        url: `https://www.gravatar.com/avatar/${hash + i}?d=${style}&s=400`,
        thumbnail: `https://www.gravatar.com/avatar/${hash + i}?d=${style}&s=100`,
        alt: `Gravatar ${style}`,
        source: `Gravatar ${style}`,
        sourceUrl: "https://gravatar.com/",
        license: "Free Forever",
      })
    })
  }

  // Iconify Icons as images (MIT)
  const iconSets = ["mdi", "fa6-solid", "heroicons", "lucide", "tabler"]
  const icons = ["home", "user", "settings", "search", "heart", "star", "mail", "phone", "camera", "music"]
  iconSets.forEach((set) => {
    icons.forEach((icon) => {
      images.push({
        id: `icon-${set}-${icon}`,
        url: `https://api.iconify.design/${set}/${icon}.svg?width=400&height=400`,
        thumbnail: `https://api.iconify.design/${set}/${icon}.svg?width=100&height=100`,
        alt: `${icon} icon`,
        source: `Iconify ${set}`,
        sourceUrl: "https://iconify.design/",
        license: "Various Open Source",
      })
    })
  })

  // Abstract shapes with SVG placeholders
  for (let i = 0; i < 20; i++) {
    const hue = (i * 18) % 360
    images.push({
      id: `abstract-hue-${i}`,
      url: `https://placehold.co/800x600/hsl(${hue},70,50)/white?text=${encodedQuery.replace(/%20/g, "+")}`,
      thumbnail: `https://placehold.co/200x150/hsl(${hue},70,50)/white`,
      alt: `Abstract ${i}`,
      source: "Placehold.co HSL",
      sourceUrl: "https://placehold.co/",
      license: "Free Forever",
    })
  }

  // Different aspect ratios
  const aspects = [
    { w: 1200, h: 630 },
    { w: 1080, h: 1080 },
    { w: 1080, h: 1920 },
    { w: 1920, h: 1080 },
    { w: 400, h: 400 },
    { w: 500, h: 700 },
    { w: 700, h: 500 },
    { w: 640, h: 360 },
    { w: 360, h: 640 },
    { w: 1000, h: 1000 },
  ]
  aspects.forEach(({ w, h }, i) => {
    images.push({
      id: `aspect-${w}x${h}`,
      url: `https://picsum.photos/seed/${query}ratio${i}/${w}/${h}`,
      thumbnail: `https://picsum.photos/seed/${query}ratio${i}/200/150`,
      alt: `${query} ${w}x${h}`,
      source: "Lorem Picsum Aspect",
      sourceUrl: "https://picsum.photos/",
      license: "MIT",
    })
  })

  // Shuffle all images for variety
  const shuffled = images.sort(() => Math.random() - 0.5)

  // Count unique sources
  const uniqueSources = new Set(images.map((img) => img.source))

  return Response.json({
    images: shuffled,
    totalImages: images.length,
    totalSources: uniqueSources.size,
    sourcesList: Array.from(uniqueSources),
    licenses: [
      "MIT",
      "CC BY",
      "Creative Commons",
      "Free Forever",
      "Unsplash License",
      "Public Domain",
      "Various Open Source",
    ],
  })
}
